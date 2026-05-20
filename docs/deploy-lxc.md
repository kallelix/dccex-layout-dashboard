# Deploy: nginx in einem Proxmox-LXC + `npm run deploy`

Das Dashboard ist ein statisches SPA. Wir hosten den Build (`dist/`) per nginx in einem LXC und laden ihn mit `npm run deploy` per SSH/SCP hoch.

> **Wichtig — plain HTTP lassen.** Die Seite muss `ws://` zur CommandStation öffnen. Ein Browser blockt das von einer `https://`-Seite (Mixed Content), und die CS kann kein `wss://`. Also **keinen TLS-Reverse-Proxy** davorsetzen — Zugriff über `http://<container-ip>/`.

## 1. LXC anlegen (Proxmox)

- Template z. B. **Debian 12**, unprivileged.
- Feste IP im Anlagen-Netz (z. B. `192.168.178.50`), gleiches Subnetz wie CS/Tablet.
- Im Container:

```bash
apt update && apt install -y nginx
mkdir -p /var/www/dashboard
```

## 2. nginx konfigurieren

[`deploy/nginx-dashboard.conf`](../deploy/nginx-dashboard.conf) in den Container kopieren und aktivieren:

```bash
cp nginx-dashboard.conf /etc/nginx/sites-available/dashboard
ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/dashboard
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 3. SSH-Zugang fürs Deploy

- `sshd` läuft im LXC (bei Debian-Template i. d. R. an).
- **Key-Auth empfohlen**, sonst fragt jeder Deploy nach dem Passwort:
  ```bash
  ssh-copy-id root@192.168.178.50      # vom Dev-Rechner (Git-Bash/WSL/PowerShell mit OpenSSH)
  ```

## 4. Deploy-Ziel konfigurieren (Dev-Rechner)

`deploy.config.example.json` → `deploy.config.json` kopieren und anpassen
(die Datei ist gitignored):

```json
{ "host": "192.168.178.50", "user": "root", "path": "/var/www/dashboard", "port": 22, "layout": "anlage-v2.json" }
```

Alternativ per Env-Var: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_PORT`, `DEPLOY_LAYOUT`.

**`layout`** = welche Layout-Datei als Server-Default mitgeliefert wird. Der Deploy kopiert sie nach `dist/layout.json`; die App lädt sie beim Start automatisch (kein manuelles Hochladen am Tablet mehr). Drag&Drop überschreibt sie weiterhin lokal (localStorage); „Reset" im Layout-Panel kehrt zum Server-Layout zurück. `"layout": ""` schaltet das Bündeln ab (App nutzt dann das Beispiel).

## 5. Deployen

```bash
npm run deploy
```

Das baut (`npm run build`), leert den Web-Root und lädt `dist/` hoch. Braucht `ssh`/`scp` im PATH (Windows 10+: OpenSSH-Client ist meist vorhanden).

## 6. Am Tablet öffnen

```
http://192.168.178.50/
```

Verbinden wie gehabt zur CS (`ws://192.168.178.220:2560`). Da die Seite über HTTP läuft, ist `ws://` erlaubt.
