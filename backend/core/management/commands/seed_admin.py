"""
Create (or ensure) a default ADMIN account for local development / first run.

Usage:
    python manage.py seed_admin
    python manage.py seed_admin --username boss --password secret123 --name "Big Boss"

Never run this against production with the default password.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

Staff = get_user_model()


class Command(BaseCommand):
    help = "Create a default ADMIN staff account if it does not already exist."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="admin12345")
        parser.add_argument("--name", default="System Administrator")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        name = options["name"]

        if Staff.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f"Staff '{username}' already exists — skipping.")
            )
            return

        user = Staff(
            username=username,
            full_name=name,
            role="ADMIN",
            is_staff=True,
            is_superuser=True,
        )
        user.set_password(password)
        user.save()
        self.stdout.write(
            self.style.SUCCESS(f"Created ADMIN '{username}' with password '{password}'.")
        )
