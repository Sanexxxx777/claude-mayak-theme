# Mayak

A cut-paper lighthouse behind the chat in the Claude desktop app. *Mayak* is Russian for "lighthouse".

![Mayak by day](assets/day.png)
![Mayak by night](assets/night.png)

## What it does

- Draws a layered paper scene behind the conversation in the Code tab of Claude Desktop: a striped lighthouse on a cliff, a paper sea, a sailboat, dune grass with sea-pinks.
- Keeps it gently moving: waves roll, clouds drift, gulls cross the sky, the boat rocks and sails, the grass sways, flags flutter, a small ship crosses the horizon.
- Follows your system appearance. By day you get the sun, clouds and gulls. At night the lighthouse lamp lights up, its beam turns, stars twinkle and the ship carries a light. The mod checks the system once a minute (macOS, Windows, GNOME on Linux) and swaps the scene.
- Recolors the app in matching tones for both modes: warm paper by day, night sea by night.
- Holds still when your system asks for reduced motion.

## Install

At the prompt of a Claude Code session:

```
/plugin install mayak --marketplace Sanexxxx777/claude-mayak-theme
```

Answer `y` to add the marketplace, then pick a scope. Open a new session in the desktop app and send any message.

From a shell:

```
claude plugin install mayak --marketplace Sanexxxx777/claude-mayak-theme
```

## Use

- `/mayak off` clears the theme and remembers that you turned it off.
- `/mayak on` brings it back.

If another theme plugin has a theme saved for the same project (for example `/custom-theme` from Anthropic's theme examples), it can take the window back at your next message. `/custom-theme off` clears that choice.

## Requirements

A version of Claude Desktop that draws mod backdrops: local sessions in the Code tab. A terminal session does not draw themes.

## How it is made

- One SVG per look, built in TypeScript with no image files. Every paper piece is drawn four times: two soft shadows, a light edge, then the paper. The technique follows Anthropic's Paper Garden example (theme-examples, Apache-2.0). The drawing and the code here are original.
- Day and night are two separate drawings, and the mod picks one from the system. In the desktop app, a backdrop whose CSS reacts to the color scheme by itself (`prefers-color-scheme`, `light-dark()`, `color-scheme`) stood still in our tests, so the switch lives in the mod.
- The interface palette was tuned with Claude Code's color helper and ships as plain data in `hooks/palette.ts`.

## По-русски

Бумажный маяк за чатом в Claude Desktop. Днём солнце, облака и чайки, ночью луна, звёзды и вращающийся луч маяка. Тема сама переключается вместе с темой системы, раз в минуту.

Установка, в строке ввода сессии Claude Code:

```
/plugin install mayak --marketplace Sanexxxx777/claude-mayak-theme
```

Выключить: `/mayak off`. Включить: `/mayak on`.

## Credits

Made by Aleksandr_NFA ([Telegram](https://t.me/Aleksandr_NFA), [GitHub](https://github.com/Sanexxxx777)) with Claude Code.

## License

[MIT](LICENSE)
