"""Loopback-only development inbox; never used by the hosted application."""

import html
import json
import re
import threading
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from aiosmtpd.controller import Controller

messages = []
lock = threading.Lock()


class MailHandler:
    async def handle_DATA(self, server, session, envelope):
        message = BytesParser(policy=policy.default).parsebytes(envelope.content)
        body = message.get_body(preferencelist=("plain",))
        record = {
            "to": str(message.get("To", "")),
            "subject": str(message.get("Subject", "")),
            "body": body.get_content() if body else "",
        }
        with lock:
            messages.append(record)
        return "250 Message accepted by local test inbox"


def linked_body(body):
    escaped = html.escape(body)
    return re.sub(r"http://127\.0\.0\.1:5173/[^\s<]+", lambda match: '<a href="' + match.group(0) + '">Open email link</a>', escaped)


class InboxHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # No CORS; reject DNS-rebinding hosts. Inbox includes bearer verification links.
        if self.headers.get("Host") not in ("127.0.0.1:8025", "localhost:8025"):
            self.send_error(403)
            return
        with lock:
            snapshot = list(reversed(messages))
        if self.path == "/api/messages":
            payload = json.dumps(snapshot).encode()
            content_type = "application/json"
        elif self.path == "/":
            rows = "".join(
                "<article><h2>"
                + html.escape(m["subject"])
                + "</h2><p>To: "
                + html.escape(m["to"])
                + "</p><pre>"
                + linked_body(m["body"])
                + "</pre></article>"
                for m in snapshot
            )
            payload = (
                "<!doctype html><html><meta charset='utf-8'><title>Local test inbox</title>"
                "<h1>Local test inbox</h1><p>Messages stay on this machine. Refresh to check for new mail. "
                "Open the link in a message to continue in the app.</p><a href='/'>Refresh inbox</a>"
                + (rows or "<p>No messages yet.</p>")
                + "</html>"
            ).encode()
            content_type = "text/html; charset=utf-8"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    controller = Controller(MailHandler(), hostname="127.0.0.1", port=1025)
    controller.start()
    try:
        ThreadingHTTPServer(("127.0.0.1", 8025), InboxHandler).serve_forever()
    finally:
        controller.stop()
