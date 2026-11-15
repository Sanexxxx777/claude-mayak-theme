// Mayak: a cut-paper lighthouse behind the chat in the Claude desktop app.
// The scene follows the system's light or dark mode: the mod reads the operating system's appearance at session
// start and once a minute, and sets the day or the night drawing. The drawings hold no color-scheme-dependent CSS
// (no prefers-color-scheme block, no light-dark(), no color-scheme property): in the desktop app any of them held a
// backdrop's animation still. The interface colors carry both halves, so the app paints them in either mode itself.
// /mayak off clears the look and remembers it; /mayak on brings it back.
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { PALETTE } from './palette'
import { mayakSvg } from './scene'
import type { Look } from './scene'

const PLUGIN = 'mayak'
const ALT = 'A cut-paper lighthouse on a cliff over a layered paper sea: sun and gulls by day, moon, stars and a turning beam by night'
const CHECK_MS = 60_000

/** A short hash of a drawing: the scene's name changes with every version, so no surface can keep an older one. */
function version(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i += 1) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

const DRAWINGS: Record<Look, { scene: string; svg: string }> = {
  day: (svg => ({ scene: `mayak-day-${version(svg)}`, svg }))(mayakSvg('day')),
  night: (svg => ({ scene: `mayak-night-${version(svg)}`, svg }))(mayakSvg('night')),
}
const BY_SCENE: Record<string, string> = {
  [DRAWINGS.day.scene]: DRAWINGS.day.svg,
  [DRAWINGS.night.scene]: DRAWINGS.night.svg,
}

/** One way to ask an operating system for its appearance: the command, and how to read a dark answer. */
type Probe = { argv: string[]; isDark: (exitCode: number, stdout: string) => boolean }

const PROBES: Probe[] = [
  // macOS: prints "Dark" in dark mode, fails in light mode.
  { argv: ['/usr/bin/defaults', 'read', '-g', 'AppleInterfaceStyle'], isDark: (code, out) => code === 0 && /dark/i.test(out) },
  // Windows: AppsUseLightTheme is 0x0 in dark mode.
  {
    argv: ['reg', 'query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize', '/v', 'AppsUseLightTheme'],
    isDark: (code, out) => code === 0 && /AppsUseLightTheme\s+REG_DWORD\s+0x0\b/i.test(out),
  },
  // Linux (GNOME and those that follow its setting): 'prefer-dark'.
  { argv: ['gsettings', 'get', 'org.gnome.desktop.interface', 'color-scheme'], isDark: (code, out) => code === 0 && /dark/i.test(out) },
]

/** The look the mod last set in this session's module, and the probe that answered; a reload starts them over. */
let shown: Look | undefined
let working: Probe | undefined

/** Whether a probe's command exists here: macOS's `defaults` fails in light mode, so only a missing command rules it out. */
async function ask($: EngineInterface, probe: Probe): Promise<Look | undefined> {
  try {
    const { exitCode, stdout } = await $.process.run(probe.argv, { timeoutMs: 5000 })
    return probe.isDark(exitCode, stdout) ? 'night' : 'day'
  } catch {
    return undefined
  }
}

/** The system's appearance as a look; where no probe answers, the last look, else day. */
async function systemLook($: EngineInterface): Promise<Look> {
  if (working !== undefined) {
    return (await ask($, working)) ?? shown ?? 'day'
  }
  for (const probe of PROBES) {
    const look = await ask($, probe)
    if (look !== undefined) {
      working = probe
      return look
    }
  }
  return shown ?? 'day'
}

async function apply($: EngineInterface, look: Look): Promise<string> {
  const args: ThemeSetArgs = {
    colors: PALETTE,
    // Glass without a tint takes the app's own panel color, which follows the mode.
    backdrop: { scene: DRAWINGS[look].scene, glass: { blur: 16, opacity: 0.5 } },
  }
  const set = await $.theme.set(args)
  shown = look
  return set.isDrawn ? 'Mayak is on.' : `Mayak is saved, but this window does not draw themes yet: ${set.reason}`
}

async function follow($: EngineInterface): Promise<void> {
  if ((await $.store.get('off')) === true) {
    return
  }
  const look = await systemLook($)
  if (look !== shown) {
    await apply($, look)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'mayak', description: 'Mayak theme: /mayak off turns it off, /mayak on turns it back on' })

    shown = undefined
    await follow($)
    $.clock.every(CHECK_MS, () => {
      void follow($).catch(() => undefined)
    })

    return next(e)
  })

  on('command.run', { command: 'mayak' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'off') {
      await $.store.set('off', true)
      await $.theme.clear()
      shown = undefined
      return { text: 'Mayak is off. Turn it back on: /mayak on' }
    }

    await $.store.delete('off')
    return { text: await apply($, await systemLook($)) }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const source = BY_SCENE[e.props.scene]
    if (e.props.plugin !== PLUGIN || source === undefined) {
      return next(e)
    }
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg isInteractive alt={ALT} source={source} />
  })
}
