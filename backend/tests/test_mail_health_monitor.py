import logging

from app.services import mail_health_monitor as monitor


def test_warning_spike_from_a_watched_logger_triggers_one_alert(monkeypatch) -> None:
    monitor.install()
    alerts: list[tuple[str, str]] = []
    monkeypatch.setattr(monitor, "send_alert", lambda subject, body: alerts.append((subject, body)))

    watched = logging.getLogger("novarise.mail_client")
    for _ in range(monitor.WARNING_THRESHOLD + 1):
        watched.warning("STATUS command failed for %s: BAD", "[Gmail]/All Mail")

    monitor.check_once()

    assert len(alerts) == 1
    subject, body = alerts[0]
    assert "novarise.mail_client" in subject
    assert str(monitor.WARNING_THRESHOLD + 1) in body

    # drain() must actually reset the count - immediately checking again
    # with no new warnings must not re-alert on the same ones.
    monitor.check_once()
    assert len(alerts) == 1


def test_a_few_warnings_under_the_threshold_do_not_alert(monkeypatch) -> None:
    monitor.install()
    alerts: list[tuple[str, str]] = []
    monkeypatch.setattr(monitor, "send_alert", lambda subject, body: alerts.append((subject, body)))

    watched = logging.getLogger("novarise.hostinger_api")
    for _ in range(monitor.WARNING_THRESHOLD):
        watched.warning("transient hiccup")

    monitor.check_once()

    assert alerts == []


def test_repeated_refresh_failures_trigger_an_alert(monkeypatch) -> None:
    alerts: list[tuple[str, str]] = []
    monkeypatch.setattr(monitor, "send_alert", lambda subject, body: alerts.append((subject, body)))

    for _ in range(monitor.REFRESH_FAILURE_THRESHOLD + 1):
        monitor.record_refresh_failure()

    monitor.check_once()

    assert any("refresh" in subject.lower() for subject, _ in alerts)
