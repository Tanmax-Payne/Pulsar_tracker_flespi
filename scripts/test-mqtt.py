#!/usr/bin/env python3
"""
Standalone MQTT connectivity test against Flespi.

Isolates exactly which stage is broken, independent of the Next.js app:
  1. CONNECT  — is the token itself valid and allowed to use MQTT?
  2. SUBACK   — does the token's ACL actually cover our topics? (a denied
                reason code here is the ACL topic-scope mismatch)
  3. MESSAGE  — is the device actually publishing anything right now?

Usage:
    pip3 install paho-mqtt certifi
    python3 scripts/test-mqtt.py YOUR_FLESPI_TOKEN [device_id1,device_id2,...]

If no device IDs are given, subscribes with a wildcard ("+") instead.

Note: macOS Python installs commonly hit
"SSLCertVerificationError: unable to get local issuer certificate" here —
that's a missing-CA-bundle problem with the Python install, not this
script or Flespi. Installing `certifi` (above) and using its bundle
below works around it without needing "Install Certificates.command".
"""

import sys
import time

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("Missing dependency. Install it with:\n\n    pip3 install paho-mqtt\n")
    sys.exit(1)

try:
    import certifi
    CA_BUNDLE = certifi.where()
except ImportError:
    CA_BUNDLE = None  # fall back to the system default and hope it's sane

# Extra context on top of the library's own reason-code name. paho
# defaults to MQTT v5, whose reason codes (134, 135, ...) differ from
# classic MQTT 3.1.1 (4, 5, ...) — these are the v5 ones that show up
# in practice against Flespi.
CONNACK_MEANINGS = {
    134: "The token itself is wrong, malformed, or doesn't exist.",
    135: "The token is valid but isn't allowed to use MQTT at all — check it has an MQTT ACL grant (not just REST).",
}

LISTEN_SECONDS = 20


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python3 {sys.argv[0]} <FLESPI_TOKEN> [device_id1,device_id2,...]")
        sys.exit(1)

    token = sys.argv[1]
    device_ids = sys.argv[2].split(",") if len(sys.argv) > 2 else ["+"]

    topics = []
    for did in device_ids:
        topics.append(f"flespi/state/gw/devices/{did}/telemetry/+")
        topics.append(f"flespi/message/gw/devices/{did}/#")

    received = []
    connect_failed = False

    # CallbackAPIVersion.VERSION2 uses MQTT5-style signatures: reason codes
    # arrive as ReasonCode objects, not plain ints. They compare equal to
    # ints directly (rc == 0 works) and str() gives the official name
    # ("Success", "Not authorized", etc); .value holds the raw int if needed.
    def on_connect(client, userdata, connect_flags, reason_code, properties=None):
        nonlocal connect_failed
        print(f"\n[CONNECT] result code {reason_code.value}: {reason_code}")
        hint = CONNACK_MEANINGS.get(reason_code.value)
        if hint:
            print(f"   ^ {hint}")
        if reason_code != 0:
            print("Stopping here — fix the token itself before worrying about ACL/topics.")
            connect_failed = True
            client.disconnect()
            return
        print("[CONNECT] Success — token and credentials are valid.")
        print("[SUBSCRIBE] Requesting:")
        for t in topics:
            print(f"   {t}")
        for t in topics:
            client.subscribe(t, qos=1)

    def on_subscribe(client, userdata, mid, reason_code_list, properties=None):
        print(f"[SUBACK] mid={mid} granted={[str(rc) for rc in reason_code_list]}")
        if any(rc.is_failure for rc in reason_code_list):
            print("   ^ DENIED. The token's ACL does not cover this topic.")
            print("     Fix: add an ACL rule for 'flespi/#' (or narrower:")
            print("     'flespi/state/gw/devices/#' and 'flespi/message/gw/devices/#')")
            print("     with 'subscribe' checked, in the Flespi token editor.")
        else:
            print("   ^ Granted — ACL is correctly scoped for this topic.")

    def on_message(client, userdata, msg):
        received.append(msg)
        preview = msg.payload[:200]
        print(f"[MESSAGE] {msg.topic}: {preview!r}")

    def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
        print(f"[DISCONNECT] {reason_code}")

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"pulsar-mqtt-test-{int(time.time())}",
    )
    client.username_pw_set(username=f"FlespiToken {token}", password="")
    client.tls_set(ca_certs=CA_BUNDLE)  # Flespi requires TLS on port 8883

    client.on_connect = on_connect
    client.on_subscribe = on_subscribe
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    print("Connecting to mqtt.flespi.io:8883 ...")
    client.connect("mqtt.flespi.io", 8883, keepalive=30)

    client.loop_start()
    print(f"Listening for up to {LISTEN_SECONDS}s for live messages (device must be actively reporting)...\n")
    waited = 0.0
    while waited < LISTEN_SECONDS and not connect_failed:
        time.sleep(0.5)
        waited += 0.5
    client.loop_stop()
    client.disconnect()

    print(f"\n{'=' * 60}")
    print(f"SUMMARY: received {len(received)} message(s) in {LISTEN_SECONDS}s")
    if not received:
        print("No messages arrived. Check the [SUBACK] lines above first —")
        print("if any showed 128 (denied), that's the fix needed. If all were")
        print("granted, the device(s) may simply not be reporting right now.")


if __name__ == "__main__":
    main()
