#!/usr/bin/env python3
"""
Generate a secure SECRET_KEY for SkillSwap deployment.
Run this and copy the output to your Railway environment variables.
"""

import secrets

secret_key = secrets.token_urlsafe(32)
print(f"Generated SECRET_KEY:\n{secret_key}\n")
print("Copy this value to your Railway dashboard under environment variables.")
print("Name: SECRET_KEY")
