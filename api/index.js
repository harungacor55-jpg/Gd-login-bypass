// ============================================================
// GD Private Server Handler — api/index.js
// Mengambil data real dari GDBrowser API untuk respons valid
// ============================================================

const GDBROWSER = 'https://gdbrowser.com/api';

// Helper: fetch JSON dari GDBrowser, return null kalau error
async function gbFetch(path) {
  try {
    const res = await fetch(`${GDBROWSER}${path}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (text === '-1' || text.trim() === '') return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// Helper: ambil body dari request (Vercel/Node)
async function getBody(req) {
  return new Promise((resolve) => {
    if (req.body) {
      // Vercel sudah parse body
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

// Helper: encode base64
function b64(str) {
  return Buffer.from(String(str)).toString('base64');
}

// Helper: decode base64
function db64(str) {
  try {
    return Buffer.from(String(str), 'base64').toString('utf8');
  } catch {
    return str;
  }
}

// ── Daftar teman statis (biar keliatan rame) ──────────────────
// playerID fiktif tapi konsisten, accountID fiktif
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

// ── Pesan masuk statis ────────────────────────────────────────
const STATIC_MESSAGES = [
  { senderName: 'mas amba',      senderAccountID: '40000001', subject: b64('halo bro'), body: b64('gimana kabarnya?'),    messageID: '10001', isNew: '1', age: '2 hours' },
  { senderName: 'rusdi',         senderAccountID: '40000002', subject: b64('main yuk'), body: b64('ayo main bareng'),     messageID: '10002', isNew: '0', age: '1 day' },
  { senderName: 'bunda rahma',   senderAccountID: '40000007', subject: b64('sukses ya'), body: b64('semangat terus'),     messageID: '10003', isNew: '0', age: '3 days' },
  { senderName: 'mr ironi',      senderAccountID: '40000009', subject: b64('nice level'), body: b64('levelnya mantap'),   messageID: '10004', isNew: '1', age: '5 hours' },
  { senderName: 'kakangkuh',     senderAccountID: '40000010', subject: b64('gg bro'), body: b64('gg wp'),                 messageID: '10005', isNew: '0', age: '2 days' },
];

// ── Friend requests statis ────────────────────────────────────
const STATIC_FRIEND_REQS = [
  { username: 'fajar basekal', playerID: '30000008', accountID: '40000008', reqID: '20001', age: '1 hour' },
  { username: 'mas narji',     playerID: '30000006', accountID: '40000006', reqID: '20002', age: '3 hours' },
];

// ============================================================
// FORMAT BUILDERS — ubah JSON GDBrowser ke format GD server
// ============================================================

// Format respons loginGJAccount: "accountID,playerID"
function formatLogin(profile) {
  return `${profile.accountID},${profile.playerID}`;
}

// Format respons getGJUserInfo20
// Key GD: 1=username,2=playerID,16=accountID,13=coins,17=userCoins,
//         8=stars,9=demons,10=rank,14=age,
//         21=messageState,22=friendState,23=commentHistoryState
function formatUserInfo(p) {
  const parts = [
    `1:${p.username}`,
    `2:${p.playerID}`,
    `16:${p.accountID}`,
    `8:${p.stars || 0}`,
    `9:${p.demons || 0}`,
    `10:${p.rank || 0}`,
    `13:${p.coins || 0}`,
    `17:${p.userCoins || 0}`,
    `18:${p.diamonds || 0}`,
    `19:${p.orbs || 0}`,
    `28:${p.creatorPoints || 0}`,
    `21:0`,
    `22:0`,
    `23:0`,
    `29:0`,
    `30:0`,
  ];
  return parts.join(':');
}

// Format getGJAccountComments20
// Setiap komentar: "2~<content_b64>~3~<playerID>~4~<likes>~9~<date>~6~<commentID>#<total>:0:10"
function formatProfileComments(comments) {
  if (!comments || comments.length === 0) return '-1';
  const formatted = comments.map((c, i) => {
    const content = b64(c.content || '');
    const playerID = c.playerID || '0';
    const likes = c.likes || 0;
    const date = c.date || '1 day';
    const cID = c.ID || (10000 + i);
    return `2~${content}~3~${playerID}~4~${likes}~9~${date}~6~${cID}`;
  });
  return `${formatted.join('|')}#${comments.length}:0:10`;
}

// Format getGJLevels21 (levels by user)
// Minimal format: 1=ID,2=name,5=version,6=playerID,8=hasPassOrDiff,9=diff,
//                 10=downloads,12=audioTrack,13=gameVersion,14=likes,
//                 17=demon,43=mainDiff,45=objects,25=auto
function formatLevels(levels) {
  if (!levels || levels.length === 0) return '-1';
  const formatted = levels.map((lv) => {
    return [
      `1:${lv.id || 0}`,
      `2:${lv.name || 'Unknown'}`,
      `5:${lv.version || 1}`,
      `6:${lv.playerID || 0}`,
      `8:10`,
      `9:${lv.difficulty === 'Auto' ? 3 : lv.difficulty === 'Easy' ? 1 : lv.difficulty === 'Normal' ? 2 : lv.difficulty === 'Hard' ? 3 : lv.difficulty === 'Harder' ? 4 : lv.difficulty === 'Insane' ? 5 : lv.difficulty === 'Easy Demon' ? 6 : lv.difficulty === 'Medium Demon' ? 6 : lv.difficulty === 'Hard Demon' ? 6 : lv.difficulty === 'Insane Demon' ? 6 : lv.difficulty === 'Extreme Demon' ? 6 : 0}`,
      `10:${lv.downloads || 0}`,
      `12:${lv.audioTrack || 0}`,
      `13:21`,
      `14:${lv.likes || 0}`,
      `17:${lv.demon ? 1 : 0}`,
      `25:${lv.auto ? 1 : 0}`,
      `43:${lv.demonDifficulty || 0}`,
      `45:${lv.objects || 0}`,
      `35:${lv.songID || 0}`,
    ].join(':');
  });
  // Tambah separator dan hash dummy
  return `${formatted.join('|')}#${levels.length}:0:10#`;
}

// Format getGJUserList20 (friend list)
function formatFriendList(profile, staticFriends) {
  const all = [];

  // Tambah data profil real kalau ada
  if (profile) {
    all.push(`1:${profile.username}:2:${profile.playerID}:16:${profile.accountID}:41:1`);
  }

  // Tambah teman statis
  for (const f of staticFriends) {
    all.push(`1:${f.username}:2:${f.playerID}:16:${f.accountID}:41:0`);
  }

  return all.join('|');
}

// Format getGJMessages20
function formatMessages(msgs) {
  if (!msgs || msgs.length === 0) return '-1';
  const formatted = msgs.map((m) => {
    return [
      `6:${m.senderName}`,
      `3:${m.senderAccountID}`,
      `2:${m.messageID}`,
      `1:${m.messageID}`,
      `4:${m.subject}`,
      `8:${m.isNew}`,
      `9:0`,
      `7:${m.age}`,
    ].join(':');
  });
  return formatted.join('|');
}

// Format getGJFriendRequests20
function formatFriendRequests(reqs) {
  if (!reqs || reqs.length === 0) return '-1';
  const formatted = reqs.map((r) => {
    return [
      `1:${r.username}`,
      `2:${r.playerID}`,
      `32:${r.accountID}`,
      `35:${b64('Halo! Boleh add?')}`,
      `37:${r.age}`,
      `41:${r.reqID}`,
    ].join(':');
  });
  return formatted.join('|');
}

// Format getGJSongInfo
function formatSong(song) {
  if (!song) return '-1';
  return [
    `1~|~${song.id || 0}`,
    `2~|~${song.name || 'Unknown'}`,
    `4~|~${song.artist || 'Unknown'}`,
    `10~|~${song.size || '0.00'}`,
    `6~|~${song.artistID || 0}`,
    `5~|~${b64(song.link || '')}`,
  ].join('~|~');
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  const path = req.url || '';
  const body = await getBody(req);

  res.setHeader('Content-Type', 'text/plain');

  // ── loginGJAccount.php ──────────────────────────────────────
  if (path.includes('loginGJAccount')) {
    const username = body.userName || body.username || '';
    if (!username) return res.status(200).send('-1');

    const profile = await gbFetch(`/profile/${encodeURIComponent(username)}`);
    if (!profile || profile === '-1') return res.status(200).send('-1');

    return res.status(200).send(formatLogin(profile));
  }

  // ── getGJUserInfo20.php ─────────────────────────────────────
  if (path.includes('getGJUserInfo20')) {
    // targetAccountID bisa ada, atau pakai userName
    const targetID = body.targetAccountID || body.accountID || '';
    const userName = body.userName || body.str || '';

    let profile = null;

    if (userName) {
      profile = await gbFetch(`/profile/${encodeURIComponent(userName)}`);
    } else if (targetID) {
      // GDBrowser support lookup by accountID
      profile = await gbFetch(`/profile/${encodeURIComponent(targetID)}`);
    }

    if (!profile) return res.status(200).send('-1');

    return res.status(200).send(formatUserInfo(profile));
  }

  // ── updateGJUserScore22.php ─────────────────────────────────
  if (path.includes('updateGJUserScore22')) {
    const accountID = body.accountID || '0';
    return res.status(200).send(String(accountID));
  }

  // ── getGJAccountComments20.php ──────────────────────────────
  if (path.includes('getGJAccountComments20')) {
    const accountID = body.accountID || '';
    const userName = body.userName || '';

    let identifier = userName || accountID;
    if (!identifier) return res.status(200).send('-1');

    // Kalau cuma accountID, coba resolve username dulu lewat profile
    if (!userName && accountID) {
      const prof = await gbFetch(`/profile/${encodeURIComponent(accountID)}`);
      if (prof && prof.username) identifier = prof.username;
    }

    const comments = await gbFetch(
      `/comments/${encodeURIComponent(identifier)}?type=profile&count=10`
    );

    return res.status(200).send(formatProfileComments(comments));
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

  // ── getGJUserList20.php (friend list) ───────────────────────
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

  // ── getGJDailyLevel.php ─────────────────────────────────────
  if (path.includes('getGJDailyLevel')) {
    const weekly = body.weekly === '1';
    const endpoint = weekly ? '/daily?weekly=1' : '/daily';
    const data = await gbFetch(endpoint);
    if (!data) return res.status(200).send('-1');
    // data bisa berupa object atau langsung ID
    const id = data.id || data || 0;
    return res.status(200).send(`${id}|87400`);
  }

  // ── getGJSongInfo.php ───────────────────────────────────────
  if (path.includes('getGJSongInfo')) {
    const songID = body.songID || '';
    if (!songID) return res.status(200).send('-1');

    const song = await gbFetch(`/song/${encodeURIComponent(songID)}`);
    return res.status(200).send(formatSong(song));
  }

  // ── getGJLevels21.php ───────────────────────────────────────
  if (path.includes('getGJLevels21')) {
    const type = body.type || '0';
    const str = body.str || '';
    const accountID = body.accountID || '';

    let levels = null;

    // type 5 = search by user (creator levels)
    if (type === '5' && (str || accountID)) {
      const identifier = str || accountID;
      levels = await gbFetch(
        `/search/${encodeURIComponent(identifier)}?type=byuser&count=10`
      );
    } else if (str) {
      // search by name/ID
      levels = await gbFetch(
        `/search/${encodeURIComponent(str)}?count=10`
      );
    }

    return res.status(200).send(formatLevels(levels));
  }

  // ── uploadGJAccComment20.php ────────────────────────────────
  if (path.includes('uploadGJAccComment20')) {
    // Fake sukses dengan comment ID random
    const fakeID = Math.floor(60000000 + Math.random() * 9999999);
    return res.status(200).send(String(fakeID));
  }

  // ── uploadGJComment21.php ───────────────────────────────────
  if (path.includes('uploadGJComment21')) {
    const fakeID = Math.floor(60000000 + Math.random() * 9999999);
    return res.status(200).send(String(fakeID));
  }

  // ── uploadGJLevel21.php ─────────────────────────────────────
  if (path.includes('uploadGJLevel21')) {
    const fakeID = Math.floor(10000000 + Math.random() * 9999999);
    return res.status(200).send(String(fakeID));
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

  // ── Fallback ────────────────────────────────────────────────
  return res.status(200).send('-1');
  }
  
