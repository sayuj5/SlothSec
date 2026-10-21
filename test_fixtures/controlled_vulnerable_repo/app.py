import os
import subprocess

def insecure_user_runner(user_cmd: str):
    # Intentional test SAST vulnerability for Semgrep rule detection:
    # Use of shell=True with dynamic user input
    return subprocess.check_output(user_cmd, shell=True)

def insecure_eval(user_input: str):
    # Intentional test SAST vulnerability for Semgrep rule detection:
    # Dangerous eval of untrusted input
    return eval(user_input)
