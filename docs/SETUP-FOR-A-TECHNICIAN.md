# Setting up TechTech Flight on a school laptop

One page. Follow it top to bottom once, and the trolley works every morning after that.

You need: the laptop, a travel router, and the iPads. **No internet, no accounts, no cards.**

---

## 1. The router

The classroom has its own network. It is not the school Wi-Fi, and that is deliberate.

An ESP32 cannot join WPA-Enterprise, which is the username-and-password kind nearly every
school runs. Client isolation then blocks the iPads from reaching the laptop, and a captive
portal blocks both. Three walls, none of them arguable with on the morning of a lesson.

- Plug the travel router in. It does not need an internet connection at all.
- Set the network name and password to something fixed, and write both on a card taped to the
  trolley. **They must never change**, because the drones have them in their firmware.
- Use **WPA2**, not WPA3 and not open.

## 2. The laptop

- Join the laptop to the router's network.
- In the router's admin page, give the laptop a **static address** — a "DHCP reservation" or
  "static lease" against its MAC address. Anything ending `.2` is conventional, for example
  `10.0.0.2`.

A static address means the board's URL never changes, so it can be printed on the card too.

## 3. The app

- Copy the whole **TechTech Flight** folder onto the laptop. Anywhere the Teacher can find it;
  the Desktop is fine.
- Double-click **Start TechTech Flight.bat**.

The first run takes a few minutes and does everything on its own. Every run after that is
seconds.

Two windows open and both stay open while the class runs:

| Window | What it is |
|---|---|
| Ground station | The engine. Closing it ends the lesson |
| The board | What the Teacher works on, at `http://localhost:4321` |

The launcher also prints **the address for the iPads** and draws it as a QR code. That address
is `http://<laptop>:4321/student` — the Student door — never `localhost`. Settings shows the
same URL, so a Teacher can copy it onto the trolley card without reading a terminal window.

> **The Teacher's own board must stay on `localhost`.** The camera is refused on a plain
> `http://` address that is not localhost, so a board opened at `10.0.0.2` looks like it has a
> permissions problem. The launcher already opens the right one; do not "fix" it.

## 4. The iPads

- Join each iPad to the router's network.
- Open the address the launcher printed, or point the camera at the QR code.
- Add it to the Home Screen so a child never sees an address bar.
- Turn on **Guided Access** (Settings, Accessibility, Guided Access). Triple-click the side
  button to lock an iPad into the app. This is the real lock on the Student side; the PIN on
  the Teacher's board keeps a child off the Teacher's screen, not out of the iPad.

## 5. Check it before a class needs it

1. On the laptop, open Settings and press **Set up a demonstration lesson**.
2. Open the Mission. Every step should be reachable.
3. On an iPad, open the address and join with the four-letter code on the Teacher's board.
4. **Pull the network cable out of the router, or turn its internet off.** Everything must keep
   working. If it does not, something is still reaching outside the room and that is worth
   reporting.

---

## Where the records live, and what to back up

`Documents\TechTech Flight\records.db` on the laptop.

**It is deliberately outside the app folder**, so replacing the app folder for an update cannot
touch it. Never move it into the app folder.

The Teacher does not need to know that path. Settings has two buttons:

- **Save a copy of my records** puts a dated file on the Desktop, for a USB stick or the school
  drive.
- **Export for a spreadsheet** writes a register as CSV.

If your backup software covers `Documents`, the records are already covered.

Nothing is sent off the premises. There is a box in Settings for a school that wants an
off-site backup, and it is off until somebody ticks it.

## Updating

1. Close both windows.
2. Replace the whole app folder with the new one.
3. Double-click the launcher.

**The records survive**, because they were never in the folder you replaced.

## When something is wrong

| What the Teacher sees | What it means |
|---|---|
| The board says it cannot reach the ground station | The ground station window was closed. Run the launcher again |
| An iPad cannot open the address | It is on the school Wi-Fi rather than the router |
| An iPad says the classroom code has finished | The Teacher ended that lesson. Each new lesson has a new code |
| The board says iPads cannot join, and names a store | It is trying to reach something outside the room. Report the line it prints |
| A camera does not work | The board was opened at the laptop's address rather than `localhost` |
