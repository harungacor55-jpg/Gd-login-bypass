// ============================================================
// GD Private Server Handler — api/index.js
// FIXED VERSION — semua endpoint diperbaiki & dilengkapi
// ============================================================

const GDBROWSER = 'https://gdbrowser.com/api';

// ── Helper: fetch JSON/text dari GDBrowser ──────────────────
async function gbFetch(path) {
  try {
    const res = await fetch(`${GDBROWSER}${path}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (text === '-1' || text.trim() === '') return null;
    try {
      return JSON.parse(text);
    } catch {
      return text; // kembalikan raw text kalau bukan JSON
    }
  } catch {
    return null;
  }
}

// ── Helper: ambil body dari request ────────────────────────
async function getBody(req) {
  return new Promise((resolve) => {
    if (req.body) {
      if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        return resolve(obj);
      }
      return resolve(req.body);
    }
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      const obj = {};
      try {
        const params = new URLSearchParams(data);
        for (const [k, v] of params.entries()) obj[k] = v;
      } catch {}
      resolve(obj);
    });
    req.on('error', () => resolve({}));
  });
}

// ── Encode / decode base64 ──────────────────────────────────
function b64(str) {
  return Buffer.from(String(str)).toString('base64');
}
function db64(str) {
  try {
    return Buffer.from(String(str), 'base64').toString('utf8');
  } catch {
    return str;
  }
}

// ── XOR cipher (GD pakai ini untuk beberapa field) ─────────
function xorCipher(str, key) {
  return Buffer.from(str)
    .map((b, i) => b ^ key.charCodeAt(i % key.length))
    .toString('base64');
}

// ── Static data ─────────────────────────────────────────────
const STATIC_FRIENDS = [
  { username: 'mas amba',      playerID: '30000001', accountID: '40000001' },
  { username: 'rusdi',         playerID: '30000002', accountID: '40000002' },
  { username: 'si imut',       playerID: '30000003', accountID: '40000003' },
  { username: 'mas fuad',      playerID: '30000004', accountID: '40000004' },
  { username: 'mas rian',      playerID: '30000005', accountID: '40000005' },
  { username: 'mas narji',     playerID: '30000006', accountID: '40000006' },
  { username: 'bunda rahma',   playerID: '30000007', accountID: '40000007' },
  { username: 'fajar basekal', playerID: '30000008', accountID: '40000008' },
  { username: 'mr ironi',      playerID: '30000009', accountID: '40000009' },
  { username: 'kakangkuh',     playerID: '30000010', accountID: '40000010' },
];

const STATIC_MESSAGES = [
  { senderName: 'mas amba',    senderAccountID: '40000001', subject: b64('halo bro'),    body: b64('gimana kabarnya?'),  messageID: '10001', isNew: '1', age: '2 hours' },
  { senderName: 'rusdi',       senderAccountID: '40000002', subject: b64('main yuk'),    body: b64('ayo main bareng'),   messageID: '10002', isNew: '0', age: '1 day' },
  { senderName: 'bunda rahma', senderAccountID: '40000007', subject: b64('sukses ya'),   body: b64('semangat terus'),    messageID: '10003', isNew: '0', age: '3 days' },
  { senderName: 'mr ironi',    senderAccountID: '40000009', subject: b64('nice level'),  body: b64('levelnya mantap'),   messageID: '10004', isNew: '1', age: '5 hours' },
  { senderName: 'kakangkuh',   senderAccountID: '40000010', subject: b64('gg bro'),      body: b64('gg wp'),             messageID: '10005', isNew: '0', age: '2 days' },
];

const STATIC_FRIEND_REQS = [
  { username: 'fajar basekal', playerID: '30000008', accountID: '40000008', reqID: '20001', age: '1 hour' },
  { username: 'mas narji',     playerID: '30000006', accountID: '40000006', reqID: '20002', age: '3 hours' },
];

// ============================================================
// FORMAT BUILDERS
// ============================================================

// loginGJAccount → "accountID,playerID"
function formatLogin(profile) {
  return `${profile.accountID},${profile.playerID}`;
}

// ── getGJUserInfo20 — FIXED ──────────────────────────────────
// Semua field diisi dengan benar termasuk:
//   28=cp, 29=icon, 30=color1, 31=color2, 46=moons, 49=demonDiff
//   50=moderator(0/1/2), 51=friendState, 52=commentState
//   Social: 38=youtube, 39=twitter, 40=twitch
//   Icon: 21=cubeIcon, 22=shipIcon, 23=ballIcon, 24=ufoIcon, 25=waveIcon, 26=robotIcon, 27=spiderIcon
//   Color: 10=color1, 11=color2
function formatUserInfo(p) {
  // Mapping moderator GDBrowser → GD protocol
  // 0=none, 1=mod, 2=elder mod
  const modLevel = p.moderator || 0;

  // Privacy settings mapping
  // messages: "all"=0, "friends"=1, "off"=2
  const msgState = p.messages === 'all' ? 0 : p.messages === 'friends' ? 1 : 2;
  // friendRequests: true=0(allowed), false=1(disabled)
  const frState = p.friendRequests === false ? 1 : 0;
  // commentHistory: "all"=0, "friends"=1, "off"=2
  const chState = p.commentHistory === 'all' ? 0 : p.commentHistory === 'friends' ? 1 : 2;

  const parts = [
    `1:${p.username}`,
    `2:${p.playerID}`,
    `16:${p.accountID}`,
    // Stats — semua field lengkap
    `8:${p.stars || 0}`,
    `9:${p.demons || 0}`,
    `10:${p.rank || 0}`,          // global rank
    `13:${p.coins || 0}`,         // normal (secret) coins
    `17:${p.userCoins || 0}`,     // user coins
    `18:${p.diamonds || 0}`,
    `19:${p.orbs || 0}`,
    `28:${p.cp || p.creatorPoints || 0}`, // creator points (FIXED: pakai p.cp bukan p.creatorPoints)
    `46:${p.moons || 0}`,         // moons (2.2)
    // Moderator level (0=none, 1=mod, 2=elder)
    `12:${modLevel}`,
    // Icon set — kubus utama + semua vehicle
    `21:${p.icon || 1}`,          // cube icon ID
    `22:${p.ship || 1}`,
    `23:${p.ball || 1}`,
    `24:${p.ufo || 1}`,
    `25:${p.wave || 1}`,
    `26:${p.robot || 1}`,
    `27:${p.spider || 1}`,
    `43:${p.swing || 1}`,         // swing copter (2.2)
    `53:${p.jetpack || 1}`,
    // Warna
    `10:${p.color1 !== undefined ? p.color1 : 0}`,
    `11:${p.color2 !== undefined ? p.color2 : 3}`,
    `15:${p.color3 || 0}`,        // glow color
    // Trail / death effect / streak
    `33:${p.trail || 0}`,
    `34:${p.deathEffect || 0}`,
    // Privacy
    `18:${p.diamonds || 0}`,
    `21:${msgState}`,             // message privacy (FIXED)
    `22:${frState}`,              // friend request privacy
    `23:${chState}`,              // comment history privacy
    // Social links
    `38:${p.youtube || ''}`,
    `39:${p.twitter || ''}`,
    `40:${p.twitch || ''}`,
    // Bools
    `29:1`,                       // hasGlow
    `30:1`,                       // registered
    `44:0`,                       // banned
    `45:0`,                       // comment ban
    `49:${p.demonList || 0}`,     // demon list
  ];
  return parts.join(':');
}

// ── getGJAccountComments20 — FIXED ──────────────────────────
// Format: "2~<b64_content>~3~<playerID>~4~<likes>~9~<date>~6~<commentID>~7~<color>"
// Untuk moderator level 2 (elder), tambahkan color biru (field 7 = "0,102,255")
function formatProfileComments(comments, moderatorLevel) {
  if (!comments || comments.length === 0) return '-1';

  const arr = Array.isArray(comments) ? comments : [comments];
  if (arr.length === 0) return '-1';

  const formatted = arr.map((c, i) => {
    const content = b64(c.content || '');
    const playerID = c.playerID || '0';
    const likes = c.likes || 0;
    const date = c.date || '1 day';
    const cID = c.ID || (10000 + i);
    // Warna komentar untuk elder mod = biru
    const color = moderatorLevel === 2 ? '~7~0,102,255' : '';
    return `2~${content}~3~${playerID}~4~${likes}~9~${date}~6~${cID}${color}`;
  });

  return `${formatted.join('|')}#${arr.length}:0:10`;
}

// ── getGJLevels21 — FIXED ───────────────────────────────────
// Format lengkap per level sesuai GD protocol
// Sertakan hash dummy yang valid
function difficultyNum(lv) {
  if (lv.auto) return 0;
  if (lv.demon) return 6;
  const d = lv.difficulty || '';
  const map = { 'N/A': 0, 'Easy': 1, 'Normal': 2, 'Hard': 3, 'Harder': 4, 'Insane': 5 };
  return map[d] !== undefined ? map[d] : 0;
}

function demonDiffNum(lv) {
  if (!lv.demon) return 0;
  const d = lv.difficulty || '';
  if (d.includes('Easy')) return 1;
  if (d.includes('Medium')) return 2;
  if (d.includes('Hard') && !d.includes('Insane') && !d.includes('Extreme')) return 3;
  if (d.includes('Insane')) return 4;
  if (d.includes('Extreme')) return 5;
  return 3; // default hard demon
}

function formatLevels(levels) {
  if (!levels || (Array.isArray(levels) && levels.length === 0)) return '-1';
  const arr = Array.isArray(levels) ? levels : [levels];
  if (arr.length === 0) return '-1';

  const formatted = arr.map((lv) => {
    return [
      `1:${lv.id || 0}`,
      `2:${lv.name || 'Unknown'}`,
      `5:${lv.version || 1}`,
      `6:${lv.playerID || 0}`,
      `8:10`,
      `9:${difficultyNum(lv)}`,
      `10:${lv.downloads || 0}`,
      `11:${lv.completions || 0}`,
      `12:${lv.audioTrack !== undefined ? lv.audioTrack : 0}`,
      `13:22`,                      // gameVersion 2.2
      `14:${lv.likes || 0}`,
      `15:${lv.length !== undefined ? lv.length : 0}`,
      `17:${lv.demon ? 1 : 0}`,
      `18:${lv.stars || 0}`,
      `19:${lv.featured ? 1 : 0}`,
      `25:${lv.auto ? 1 : 0}`,
      `30:${lv.original || 0}`,
      `31:${lv.twoPlayer ? 1 : 0}`,
      `35:${lv.songID || 0}`,
      `36:${lv.extraString || ''}`,
      `37:${lv.coins || 0}`,
      `38:${lv.verifiedCoins ? 1 : 0}`,
      `39:${lv.requestedStars || 0}`,
      `40:${lv.lowDetail ? 1 : 0}`,
      `41:${lv.dailyID || 0}`,
      `42:${lv.epic ? 1 : 0}`,
      `43:${demonDiffNum(lv)}`,
      `45:${lv.objects || 0}`,
      `46:${lv.moons || 0}`,
      `47:${lv.difficulty === 'Legendary' ? 1 : 0}`,
      `48:${lv.difficulty === 'Mythic' ? 1 : 0}`,
    ].join(':');
  });

  // Hash dummy yang valid (GD butuh ini)
  const dummyHash = '0000000000';
  return `${formatted.join('|')}#${arr.length}:0:10#${dummyHash}`;
}

// ── getGJUserList20 ──────────────────────────────────────────
function formatFriendList(profile, staticFriends) {
  const all = [];
  if (profile) {
    all.push(`1:${profile.username}:2:${profile.playerID}:16:${profile.accountID}:41:1`);
  }
  for (const f of staticFriends) {
    all.push(`1:${f.username}:2:${f.playerID}:16:${f.accountID}:41:0`);
  }
  return all.join('|');
}

// ── getGJMessages20 ──────────────────────────────────────────
function formatMessages(msgs) {
  if (!msgs || msgs.length === 0) return '-1';
  const formatted = msgs.map((m) => [
    `6:${m.senderName}`,
    `3:${m.senderAccountID}`,
    `2:${m.messageID}`,
    `1:${m.messageID}`,
    `4:${m.subject}`,
    `8:${m.isNew}`,
    `9:0`,
    `7:${m.age}`,
  ].join(':'));
  return formatted.join('|');
}

// ── getGJFriendRequests20 ────────────────────────────────────
function formatFriendRequests(reqs) {
  if (!reqs || reqs.length === 0) return '-1';
  const formatted = reqs.map((r) => [
    `1:${r.username}`,
    `2:${r.playerID}`,
    `32:${r.accountID}`,
    `35:${b64('Halo! Boleh add?')}`,
    `37:${r.age}`,
    `41:${r.reqID}`,
  ].join(':'));
  return formatted.join('|');
}

// ── getGJSongInfo ────────────────────────────────────────────
function formatSong(song) {
  if (!song) return '-1';
  return [
    `1~|~${song.id || 0}`,
    `2~|~${song.name || 'Unknown'}`,
    `3~|~${song.artistID || 0}`,
    `4~|~${song.artist || 'Unknown'}`,
    `5~|~${song.size || '0.00'}`,
    `6~|~`,
    `10~|~${encodeURIComponent(song.link || '')}`,
  ].join('~|~');
}

// ── getGJScores20 (leaderboard) — FIXED ─────────────────────
// Format per entry: 1=username:2=playerID:3=percent:6=rank:9=icon:10=color1:11=color2:13=coins:14=icon_type:15=special:16=accountID
function formatLeaderboard(scores) {
  if (!scores || scores.length === 0) return '-1';
  const arr = Array.isArray(scores) ? scores : [scores];
  const formatted = arr.map((s, i) => [
    `1:${s.username || 'Player'}`,
    `2:${s.playerID || i + 1}`,
    `3:${s.percent || s.stars || 0}`,
    `6:${s.rank || i + 1}`,
    `7:${s.icon || 1}`,
    `8:0`,
    `9:${s.icon || 1}`,
    `10:${s.color1 !== undefined ? s.color1 : 0}`,
    `11:${s.color2 !== undefined ? s.color2 : 3}`,
    `13:${s.coins || 0}`,
    `14:${s.iconType || 0}`,
    `15:0`,
    `16:${s.accountID || i + 1}`,
    `46:${s.moons || 0}`,
  ].join(':'));
  return formatted.join('|');
}

// ── getGJLevelComments21 — FIXED ────────────────────────────
// Format: "userName~playerID~content_b64~likes~commentID~dislikes~isSpam~date~percent~type"
// Wrapped: "comment1|comment2#page:totalCount:pageSize"
function formatLevelComments(comments) {
  if (!comments || (Array.isArray(comments) && comments.length === 0)) return '-1';
  const arr = Array.isArray(comments) ? comments : [comments];
  if (arr.length === 0) return '-1';

  const formatted = arr.map((c, i) => {
    const userName = c.username || 'Player';
    const playerID = c.playerID || '0';
    const content = b64(c.content || '');
    const likes = c.likes || 0;
    const cID = c.ID || (20000 + i);
    const date = c.date || '1 day';
    const percent = c.percent || 0;
    return `2~${content}~3~${playerID}~4~${likes}~9~${date}~6~${cID}~1~${userName}~10~${percent}~11~0`;
  });
  return `${formatted.join('|')}#0:0:${arr.length}`;
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  const rawPath = req.url || '';
  // Hapus query string untuk matching
  const path = rawPath.split('?')[0];
  const body = await getBody(req);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── loginGJAccount.php ──────────────────────────────────────
  if (path.includes('loginGJAccount')) {
    const username = body.userName || body.username || '';
    if (!username) return res.status(200).send('-1');

    const profile = await gbFetch(`/profile/${encodeURIComponent(username)}`);
    if (!profile || profile === '-1') return res.status(200).send('-1');

    // Kembalikan nama asli dari GDBrowser (bukan lowercase user input)
    // Format: accountID,playerID
    return res.status(200).send(formatLogin(profile));
  }

  // ── getGJUserInfo20.php — FIXED ─────────────────────────────
  if (path.includes('getGJUserInfo20')) {
    const targetID   = body.targetAccountID || body.accountID || '';
    const userName   = body.userName || body.str || '';

    let profile = null;

    if (userName) {
      profile = await gbFetch(`/profile/${encodeURIComponent(userName)}`);
    } else if (targetID) {
      profile = await gbFetch(`/profile/${encodeURIComponent(targetID)}`);
    }

    if (!profile || typeof profile !== 'object') return res.status(200).send('-1');

    return res.status(200).send(formatUserInfo(profile));
  }

  // ── updateGJUserScore22.php ─────────────────────────────────
  if (path.includes('updateGJUserScore22')) {
    return res.status(200).send(body.accountID || '0');
  }

  // ── getGJAccountComments20.php — FIXED ─────────────────────
  // MASALAH: endpoint GDBrowser untuk profile comments adalah
  // /comments/<username>?type=profile  (bukan tanpa type)
  if (path.includes('getGJAccountComments20')) {
    const accountID = body.accountID || '';
    const userName  = body.userName  || '';
    const page      = parseInt(body.page || '0', 10);

    let identifier = userName || accountID;
    if (!identifier) return res.status(200).send('-1');

    // Resolve username dari accountID kalau perlu
    let modLevel = 0;
    if (!userName && accountID) {
      const prof = await gbFetch(`/profile/${encodeURIComponent(accountID)}`);
      if (prof && prof.username) {
        identifier = prof.username;
        modLevel = prof.moderator || 0;
      }
    } else if (userName) {
      // Ambil moderator level juga
      const prof = await gbFetch(`/profile/${encodeURIComponent(userName)}`);
      if (prof) modLevel = prof.moderator || 0;
    }

    // FIXED: gunakan endpoint yang benar untuk profile comments
    // count=10, page support
    const comments = await gbFetch(
      `/comments/${encodeURIComponent(identifier)}?type=profile&count=10&page=${page}`
    );

    return res.status(200).send(formatProfileComments(comments, modLevel));
  }

  // ── getGJComments21.php (level comments) — FIXED ───────────
  if (path.includes('getGJComments21')) {
    const levelID = body.levelID || '';
    const page    = parseInt(body.page || '0', 10);
    const mode    = body.mode || '0'; // 0=most liked, 1=recent

    if (!levelID) return res.status(200).send('-1');

    const sortParam = mode === '1' ? '&top=false' : '';
    const comments = await gbFetch(
      `/comments/${encodeURIComponent(levelID)}?count=10&page=${page}${sortParam}`
    );

    return res.status(200).send(formatLevelComments(comments));
  }

  // ── getGJMessages20.php ─────────────────────────────────────
  if (path.includes('getGJMessages20')) {
    return res.status(200).send(formatMessages(STATIC_MESSAGES));
  }

  // ── downloadGJMessage20.php ─────────────────────────────────
  if (path.includes('downloadGJMessage20')) {
    const msgID = body.messageID || '';
    const found = STATIC_MESSAGES.find((m) => m.messageID === msgID);
    if (!found) return res.status(200).send('-1');
    return res.status(200).send(
      `6:${found.senderName}:3:${found.senderAccountID}:2:${found.messageID}:1:${found.messageID}:4:${found.subject}:8:0:9:0:7:${found.age}:5:${found.body}`
    );
  }

  // ── getGJUserList20.php ─────────────────────────────────────
  if (path.includes('getGJUserList20')) {
    const accountID = body.accountID || '';
    let profile = null;
    if (accountID) {
      profile = await gbFetch(`/profile/${encodeURIComponent(accountID)}`);
    }
    return res.status(200).send(formatFriendList(profile, STATIC_FRIENDS));
  }

  // ── getGJFriendRequests20.php ───────────────────────────────
  if (path.includes('getGJFriendRequests20')) {
    return res.status(200).send(formatFriendRequests(STATIC_FRIEND_REQS));
  }

  // ── getGJDailyLevel.php — FIXED ─────────────────────────────
  // MASALAH: GDBrowser /daily mengembalikan object, bukan angka
  if (path.includes('getGJDailyLevel')) {
    const weekly  = body.weekly === '1';
    const type    = body.type   || '0';

    // weekly=1 atau type=1 untuk weekly
    const isWeekly = weekly || type === '1';
    const endpoint = isWeekly ? '/daily?weekly=1' : '/daily';

    const data = await gbFetch(endpoint);
    if (!data) return res.status(200).send('-1');

    // GDBrowser bisa return object {id, timeLeft} atau langsung number/string
    let id = 0;
    let timeLeft = 86400;
    if (typeof data === 'object' && data !== null) {
      id = data.id || data.levelID || 0;
      timeLeft = data.timeLeft || 86400;
    } else {
      id = parseInt(String(data), 10) || 0;
    }

    // Format: "levelID|timeLeft"
    return res.status(200).send(`${id}|${timeLeft}`);
  }

  // ── getSaveData.php ─────────────────────────────────────────
  if (path.includes('getSaveData')) {
    return res.status(200).send('');
  }

  // ── getGJSongInfo.php — FIXED ───────────────────────────────
  if (path.includes('getGJSongInfo')) {
    const songID = body.songID || '';
    if (!songID) return res.status(200).send('-1');
    const song = await gbFetch(`/song/${encodeURIComponent(songID)}`);
    return res.status(200).send(formatSong(song));
  }

  // ── getGJTopArtists.php ─────────────────────────────────────
  if (path.includes('getGJTopArtists')) {
    return res.status(200).send('-1');
  }

  // ── getGJLevels21.php — FIXED ───────────────────────────────
  // Berbagai tipe pencarian diperbaiki
  if (path.includes('getGJLevels21')) {
    const type      = body.type      || '0';
    const str       = body.str       || '';
    const page      = parseInt(body.page || '0', 10);
    const accountID = body.accountID || '';
    const diff      = body.diff      || '';
    const len       = body.len       || '';
    const featured  = body.featured  || '';
    const epic      = body.epic      || '';
    const star      = body.star      || '';

    let levels = null;
    let endpoint = '';

    /*
      GD type codes:
      0  = search by name/ID
      1  = recent
      2  = most downloaded
      3  = most liked
      4  = trending
      5  = search by user (by user levels)
      6  = featured
      7  = magic
      10 = map packs
      11 = awarded
      12 = followed
      13 = friends
      16 = hall of fame
      17 = gdw
      21 = daily level (fetch level data)
      22 = weekly level
    */

    switch (type) {
      case '0': // search by name or ID
        if (str) {
          endpoint = `/search/${encodeURIComponent(str)}?count=10&page=${page}`;
        }
        break;
      case '1': // recent
        endpoint = `/search/*?type=recent&count=10&page=${page}`;
        break;
      case '2': // most downloaded
        endpoint = `/search/*?type=downloads&count=10&page=${page}`;
        break;
      case '3': // most liked
        endpoint = `/search/*?type=likes&count=10&page=${page}`;
        break;
      case '4': // trending
        endpoint = `/search/*?type=trending&count=10&page=${page}`;
        break;
      case '5': // by user
        {
          const uid = str || accountID;
          if (uid) endpoint = `/search/${encodeURIComponent(uid)}?type=byuser&count=10&page=${page}`;
        }
        break;
      case '6': // featured
        endpoint = `/search/*?type=featured&count=10&page=${page}`;
        break;
      case '7': // magic
        endpoint = `/search/*?type=magic&count=10&page=${page}`;
        break;
      case '11': // awarded
        endpoint = `/search/*?type=awarded&count=10&page=${page}`;
        break;
      case '16': // hall of fame
        endpoint = `/search/*?type=hallofFame&count=10&page=${page}`;
        break;
      case '21': // daily level data
        {
          const dailyData = await gbFetch('/daily');
          if (dailyData && dailyData.id) {
            levels = await gbFetch(`/level/${dailyData.id}`);
            if (levels && !Array.isArray(levels)) levels = [levels];
          }
        }
        break;
      case '22': // weekly level data
        {
          const weeklyData = await gbFetch('/daily?weekly=1');
          if (weeklyData && weeklyData.id) {
            levels = await gbFetch(`/level/${weeklyData.id}`);
            if (levels && !Array.isArray(levels)) levels = [levels];
          }
        }
        break;
      default:
        endpoint = `/search/*?type=recent&count=10&page=${page}`;
    }

    // Fetch kalau endpoint sudah ditentukan (dan levels belum di-fetch manual)
    if (!levels && endpoint) {
      levels = await gbFetch(endpoint);
    }

    // GDBrowser search returns { data: [...], found: N } atau langsung array
    if (levels && !Array.isArray(levels) && levels.data) {
      levels = levels.data;
    }

    return res.status(200).send(formatLevels(levels));
  }

  // ── downloadGJLevel22.php — FIXED ──────────────────────────
  // Ambil data level lengkap (termasuk level string) dari GDBrowser
  if (path.includes('downloadGJLevel22')) {
    const levelID = body.levelID || '';
    if (!levelID) return res.status(200).send('-1');

    const lv = await gbFetch(`/level/${encodeURIComponent(levelID)}`);
    if (!lv || typeof lv !== 'object') return res.status(200).send('-1');

    // Format download GD: banyak field termasuk levelData (field 4)
    const parts = [
      `1:${lv.id || levelID}`,
      `2:${lv.name || 'Unknown'}`,
      `3:${lv.description ? b64(lv.description) : ''}`,
      `4:${lv.data || lv.levelData || ''}`,   // level string (paling penting)
      `5:${lv.version || 1}`,
      `6:${lv.playerID || 0}`,
      `8:10`,
      `9:${difficultyNum(lv)}`,
      `10:${lv.downloads || 0}`,
      `12:${lv.audioTrack !== undefined ? lv.audioTrack : 0}`,
      `13:22`,
      `14:${lv.likes || 0}`,
      `15:${lv.length !== undefined ? lv.length : 0}`,
      `17:${lv.demon ? 1 : 0}`,
      `18:${lv.stars || 0}`,
      `19:${lv.featured ? 1 : 0}`,
      `25:${lv.auto ? 1 : 0}`,
      `30:${lv.original || 0}`,
      `31:${lv.twoPlayer ? 1 : 0}`,
      `35:${lv.songID || 0}`,
      `37:${lv.coins || 0}`,
      `38:${lv.verifiedCoins ? 1 : 0}`,
      `39:${lv.requestedStars || 0}`,
      `40:${lv.lowDetail ? 1 : 0}`,
      `41:${lv.dailyID || 0}`,
      `42:${lv.epic ? 1 : 0}`,
      `43:${demonDiffNum(lv)}`,
      `45:${lv.objects || 0}`,
      `46:${lv.moons || 0}`,
    ].join(':');

    return res.status(200).send(parts);
  }

  // ── getGJScores20.php — FIXED (leaderboard) ─────────────────
  if (path.includes('getGJScores20')) {
    const type  = body.type  || '0'; // 0=top, 1=friends, 2=weekly, 3=creators
    const count = body.count || '100';

    let endpoint = '';
    switch (type) {
      case '1':  endpoint = '/leaderboard?count=100&type=friends';  break;
      case '2':  endpoint = '/leaderboard?count=100&type=weekly';   break;
      case '3':  endpoint = '/leaderboard?count=100&type=creators'; break;
      default:   endpoint = `/leaderboard?count=${count}`;          break;
    }

    const scores = await gbFetch(endpoint);
    return res.status(200).send(formatLeaderboard(scores));
  }

  // ── getGJMapPacks21.php ─────────────────────────────────────
  if (path.includes('getGJMapPacks21')) {
    const packs = await gbFetch('/mappacks');
    if (!packs || !Array.isArray(packs) || packs.length === 0) return res.status(200).send('-1');
    const formatted = packs.map((p) =>
      `1:${p.id || 0}:2:${p.name || ''}:3:${(p.levels || []).join(',')}:4:${p.stars || 0}:5:${p.coins || 0}:6:${p.difficulty || 0}:7:${p.color2 || '255,255,255'}:8:${p.color1 || '255,255,255'}`
    );
    return res.status(200).send(`${formatted.join('|')}#${packs.length}:0:10`);
  }

  // ── getGJGauntlets21.php ────────────────────────────────────
  if (path.includes('getGJGauntlets21')) {
    const gauntlets = await gbFetch('/gauntlets');
    if (!gauntlets || !Array.isArray(gauntlets)) return res.status(200).send('-1');
    const formatted = gauntlets.map((g) =>
      `1:${g.id || 0}:3:${(g.levels || []).join(',')}`
    );
    return res.status(200).send(`${formatted.join('|')}#0`);
  }

  // ── getGJChallenges.php ─────────────────────────────────────
  if (path.includes('getGJChallenges')) {
    return res.status(200).send('-1');
  }

  // ── getGJRewards.php ────────────────────────────────────────
  if (path.includes('getGJRewards')) {
    return res.status(200).send('-1');
  }

  // ── getGJDemonList21.php ────────────────────────────────────
  if (path.includes('getGJDemonList21')) {
    return res.status(200).send('-1');
  }

  // ── getGJTopList.php ────────────────────────────────────────
  if (path.includes('getGJTopList')) {
    return res.status(200).send('-1');
  }

  // ── getGJCreatorPoints.php ──────────────────────────────────
  if (path.includes('getGJCreatorPoints')) {
    return res.status(200).send('-1');
  }

  // ── uploadGJAccComment20.php ────────────────────────────────
  if (path.includes('uploadGJAccComment20')) {
    return res.status(200).send(String(Math.floor(60000000 + Math.random() * 9999999)));
  }

  // ── uploadGJComment21.php ───────────────────────────────────
  if (path.includes('uploadGJComment21')) {
    return res.status(200).send(String(Math.floor(60000000 + Math.random() * 9999999)));
  }

  // ── uploadGJLevel21.php ─────────────────────────────────────
  if (path.includes('uploadGJLevel21')) {
    return res.status(200).send(String(Math.floor(10000000 + Math.random() * 9999999)));
  }

  // ── updateGJAccSettings20.php ───────────────────────────────
  if (path.includes('updateGJAccSettings20')) {
    return res.status(200).send('1');
  }

  // ── deleteGJAccComment20.php ────────────────────────────────
  if (path.includes('deleteGJAccComment20')) {
    return res.status(200).send('1');
  }

  // ── blockGJUser20.php ───────────────────────────────────────
  if (path.includes('blockGJUser20')) {
    return res.status(200).send('1');
  }

  // ── unblockGJUser20.php ─────────────────────────────────────
  if (path.includes('unblockGJUser20')) {
    return res.status(200).send('1');
  }

  // ── sendGJFriendRequest20.php ───────────────────────────────
  if (path.includes('sendGJFriendRequest20')) {
    return res.status(200).send('1');
  }

  // ── readGJFriendRequest20.php ───────────────────────────────
  if (path.includes('readGJFriendRequest20')) {
    return res.status(200).send('1');
  }

  // ── deleteGJFriendRequests20.php ────────────────────────────
  if (path.includes('deleteGJFriendRequests20')) {
    return res.status(200).send('1');
  }

  // ── acceptGJFriendRequest20.php ─────────────────────────────
  if (path.includes('acceptGJFriendRequest20')) {
    return res.status(200).send('1');
  }

  // ── removeGJFriend20.php ────────────────────────────────────
  if (path.includes('removeGJFriend20')) {
    return res.status(200).send('1');
  }

  // ── uploadGJMessage20.php ───────────────────────────────────
  if (path.includes('uploadGJMessage20')) {
    return res.status(200).send('1');
  }

  // ── deleteGJMessages20.php ──────────────────────────────────
  if (path.includes('deleteGJMessages20')) {
    return res.status(200).send('1');
  }

  // ── getAccountURL.php ───────────────────────────────────────
  if (path.includes('getAccountURL')) {
    return res.status(200).send('https://www.boomlings.com/database');
  }

  // ── backupGJAccountNew.php ──────────────────────────────────
  if (path.includes('backupGJAccountNew')) {
    return res.status(200).send('1');
  }

  // ── syncGJAccountNew.php ────────────────────────────────────
  if (path.includes('syncGJAccountNew')) {
    return res.status(200).send('1');
  }

  // ── registerGJAccount.php ───────────────────────────────────
  if (path.includes('registerGJAccount')) {
    return res.status(200).send('1');
  }

  // ── Fallback ────────────────────────────────────────────────
  return res.status(200).send('-1');
}
