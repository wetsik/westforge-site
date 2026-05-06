# WestForge Site

Static portfolio website for `westforge.dev`.

Deploy to the server:

```bash
sudo rm -rf /var/www/html/*
sudo cp -r westforge-site/* /var/www/html/
sudo nginx -t
sudo systemctl reload nginx
```

If uploading from Windows, copy the contents of this folder to `/var/www/html/` on the server.

After deploy, submit the sitemap in Google Search Console:

```txt
https://westforge.dev/sitemap.xml
```
