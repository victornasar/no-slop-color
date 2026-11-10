// One entry point for agents. The skill ships this file bundled with all data as
// skills/find-color/scripts/find-color.mjs; in the repo it runs against the source files.
//
//   recommend  --domains <ids> | --brief "<text>"  [--foundation light|dark] [--avoid-hues 70-110]
//              [--prefer quiet|bold] [--existing #hex] [--exclude ids] [--convention mix|follow|avoid]
//              [--count 4] [--full]
//   get        <direction-id>
//   apply      <direction-id> [--format css|tailwind|tokens] [--prefix color] [--text]
//   classify   --ground <color> --figure <color> [--accent <color>] [--area 80/20]
//              or, Image-Led: --figure <color> --scrim <color> --opacity <0-1> [--accent <color>]
//   domains    [search text]
//   conventions
import { query, parseQueryArgs } from './query.mjs';
import { apply } from './apply.mjs';
import { classifyPair, classifyImageLed } from './classify.mjs';
import { data } from './lib/data.mjs';

const HELP = `no-slop-color: curated color pairs for agents. Every color comes from the curated library.

Commands:
  recommend  --domains <ids> | --brief "<text>"  [--foundation light|dark] [--avoid-hues 70-110,...]
             [--prefer quiet|bold] [--existing #hex] [--exclude ids] [--convention mix|follow|avoid]
             [--count 4] [--full]
  get        <direction-id>
  apply      <direction-id> [--format css|tailwind|tokens] [--prefix color] [--text]
  classify   --ground <hex|oklch()> --figure <hex|oklch()> [--accent <color>] [--area 80/20]
             Image-Led (no ground): --figure <color> --scrim <color> --opacity <0-1> [--accent <color>]
  domains    [search text]
  conventions

Output is JSON. apply --text prints only the tokens.`;

export function run(argv) {
  const [cmd, ...args] = argv;
  const opt = (k, v) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : v; };
  switch (cmd) {
    case 'recommend':
      return query(parseQueryArgs(args));
    case 'get': {
      const d = data('library').directions.find((x) => x.id === args[0] || x.id === `lib.${args[0]}`);
      if (!d) throw new Error(`No direction with id ${args[0]}`);
      return d;
    }
    case 'apply': {
      const r = apply(args[0], opt('--format', 'css'), opt('--prefix', 'color'));
      return args.includes('--text') ? r.text : r;
    }
    case 'classify':
      if (opt('--scrim')) {
        if (!opt('--figure') || !opt('--opacity')) throw new Error('Image-Led classify needs --figure, --scrim and --opacity');
        return classifyImageLed({ figure: opt('--figure'), scrim: { color: opt('--scrim'), opacity: Number(opt('--opacity')) }, accent: opt('--accent') });
      }
      if (!opt('--ground') || !opt('--figure')) throw new Error('classify needs --ground and --figure, or --figure, --scrim and --opacity for Image-Led');
      return classifyPair({ ground: opt('--ground'), figure: opt('--figure'), accent: opt('--accent'), area: opt('--area') });
    case 'domains': {
      const q = args.join(' ').toLowerCase();
      const D = data('domains');
      return D.domains.filter((d) => !q || [d.id, d.label, ...(d.aliases || [])].some((k) => k.toLowerCase().includes(q))).map((d) => ({ id: d.id, label: d.label, group: d.group, aliases: d.aliases || [] }));
    }
    case 'conventions':
      return data('conventions');
    default:
      return null;
  }
}

// cli-start
import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const out = run(process.argv.slice(2));
    if (out == null) { console.log(HELP); process.exit(process.argv[2] ? 1 : 0); }
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  } catch (e) { console.error(e.message); process.exit(1); }
}
// cli-end
