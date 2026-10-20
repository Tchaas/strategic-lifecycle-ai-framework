"""Browser acceptance check against run_local.py; creates uniquely named local records."""
import json
import re
import secrets
import time
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

APP = 'http://127.0.0.1:5173'
MAIL = 'http://127.0.0.1:8025/api/messages'


def mail_link(recipient):
    for _ in range(100):
        with urlopen(MAIL) as response:
            messages = json.load(response)
        for message in messages:
            if message['to'] == recipient:
                match = re.search(r'http://127\.0\.0\.1:5173/[^\s]+', message['body'])
                if match:
                    return match.group(0)
        time.sleep(.2)
    raise AssertionError('No message delivered to the local inbox')


def main():
    suffix = secrets.token_hex(4)
    admin_email = f'admin-{suffix}@example.test'
    member_email = f'member-{suffix}@example.test'
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(APP + '/#/signup')
        page.get_by_label('Full name', exact=True).fill('Local Admin')
        page.get_by_label('Email', exact=True).fill(admin_email)
        page.get_by_label('Password', exact=True).fill('Local-testing-password-42')
        page.get_by_role('button', name='Create account', exact=True).click()
        expect(page.get_by_role('heading', name='Verify your email', exact=True)).to_be_visible()
        expect(page.get_by_role('status')).to_contain_text('No email was sent to your external address.', timeout=12000)
        expect(page.get_by_role('link', name='Open local test inbox')).to_be_visible()
        page.reload()
        expect(page.get_by_role('heading', name='Verify your email', exact=True)).to_be_visible()
        page.goto(mail_link(admin_email))
        page.get_by_role('button', name='Verify email', exact=True).click()
        expect(page.get_by_role('heading', name='Set up your workspace', exact=True)).to_be_visible()
        page.get_by_label('Workspace name', exact=True).fill('Local acceptance ' + suffix)
        page.get_by_label('Industry', exact=True).fill('Research')
        page.get_by_role('button', name='Create workspace', exact=True).click()
        expect(page.get_by_role('heading', name='Departments', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Finish workspace setup')).to_be_disabled()
        page.reload()
        expect(page.get_by_role('heading', name='Departments', exact=True)).to_be_visible()
        page.get_by_label('Department name', exact=True).fill('Operations')
        page.get_by_label('Department head', exact=True).fill('Alex')
        page.get_by_role('button', name='Add department', exact=True).click()
        expect(page.get_by_role('heading', name='Operations', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Delete department')).to_be_disabled()
        page.get_by_label('Department name', exact=True).fill('Engineering')
        page.get_by_role('button', name='Add department', exact=True).click()
        expect(page.get_by_role('heading', name='Engineering', exact=True)).to_be_visible()
        page.get_by_role('button', name='Finish workspace setup').click()
        expect(page.get_by_role('heading', name='Company Profile', exact=True)).to_be_visible()
        expect(page.get_by_label('Workspace name', exact=True)).to_have_value('Local acceptance ' + suffix)
        # Failed saves must preserve input and show failure, not success.
        page.route('**/workspaces/*', lambda route: route.fulfill(status=503, content_type='application/json', body='{"error":{"code":"unavailable","message":"Temporary test failure"}}') if route.request.method == 'PATCH' else route.continue_())
        page.get_by_label('Industry', exact=True).fill('Changed locally')
        page.get_by_role('button', name='Save company information').click()
        expect(page.get_by_role('alert')).to_contain_text('Temporary test failure')
        expect(page.get_by_label('Industry', exact=True)).to_have_value('Changed locally')
        page.unroute('**/workspaces/*')
        page.get_by_role('button', name='Save company information').click()
        expect(page.get_by_text('Company information saved.', exact=True)).to_be_visible()
        page.get_by_label('Invite email', exact=True).fill(member_email)
        page.get_by_role('button', name='Invite member', exact=True).click()
        expect(page.get_by_text('Invitation saved and queued for email delivery.', exact=True)).to_be_visible()
        member_context = browser.new_context()
        member = member_context.new_page()
        member.on('pageerror', lambda error: errors.append(str(error)))
        member.goto(mail_link(member_email))
        expect(member.get_by_label('Invited email')).to_have_value(member_email)
        member.get_by_label('Full name', exact=True).fill('Local Member')
        member.get_by_label('Password', exact=True).fill('Local-testing-password-42')
        member.get_by_role('button', name='Create account and join').click()
        expect(member.get_by_role('heading', name='Company Profile', exact=True)).to_be_visible()
        expect(member.get_by_label('Workspace name', exact=True)).to_have_attribute('readonly', '')
        expect(member.get_by_role('button', name='Invite member', exact=True)).to_have_count(0)
        member.goto(APP + '/#/departments')
        expect(member.get_by_role('heading', name='Operations', exact=True)).to_be_visible()
        expect(member.get_by_role('button', name='Edit department')).to_have_count(0)
        expect(member.get_by_role('button', name='Add department', exact=True)).to_have_count(0)
        page.get_by_role('button', name='Log Out', exact=True).click()
        page.goto(APP + '/#/login')
        page.get_by_label('Email', exact=True).fill(admin_email)
        page.get_by_label('Password', exact=True).fill('Local-testing-password-42')
        page.get_by_role('button', name='Log in', exact=True).click()
        expect(page.get_by_label('Industry', exact=True)).to_have_value('Changed locally')
        page.goto(APP + '/#/departments')
        expect(page.get_by_role('heading', name='Engineering', exact=True)).to_be_visible()
        refresh_token = page.evaluate("localStorage.getItem('slaf.auth.refresh')")
        page.route('**/auth/refresh', lambda route: route.fulfill(status=503, content_type='application/json', body='{"error":{"code":"unavailable","message":"Session temporarily unavailable"}}'))
        page.reload()
        expect(page.get_by_role('alert')).to_contain_text('Session temporarily unavailable')
        assert page.evaluate("localStorage.getItem('slaf.auth.refresh')") == refresh_token
        page.unroute('**/auth/refresh')
        page.get_by_role('button', name='Retry connection').click()
        expect(page.get_by_role('heading', name='Engineering', exact=True)).to_be_visible()
        screenshot = Path(__file__).resolve().parents[1] / '.local/onboarding/browser-departments.png'
        page.screenshot(path=str(screenshot), full_page=True)
        assert not errors, errors
        browser.close()
    print('PASS: delivered local email, signup, verification, setup, two departments, failed save, invitation, member permissions, refresh, returning sign-in.')


if __name__ == '__main__':
    main()
