// ============================================================
// GD Private Server Handler — api/index.js
// FULLY FIXED VERSION
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
      return text;
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

// ── Encode base64 ───────────────────────────────────────────
function b64(str) {
  return Buffer.from(String(str)).toString('base64');
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

// ── getGJUserInfo20 ──────────────────────────────────────────
// DIPERBAIKI: hapus semua field key duplikat, field GD protocol dibenahi
// GD field reference:
//   1=username, 2=playerID, 16=accountID
//   3=stars, 4=demons, 8=creatorPoints, 9=??, 10=color1, 11=color2
//   13=coins, 17=userCoins, 18=diamonds, 28=cp (duplicate fix)
//   46=moons, 12=moderator, 29=icon, 30=ship, 31=ball, 32=ufo
//   33=wave, 34=robot, 35=spider, 43=swing, 53=jetpack
//   38=youtube, 39=twitter, 40=twitch
//   50=message setting, 51=friendReq setting, 52=comment history
//   20=youtube (alt), 44=age
// CATATAN KRITIS: GD membaca setiap key hanya SEKALI (yang pertama muncul)
//   jadi TIDAK BOLEH ada key yang sama dua kali dalam array parts!
function formatUserInfo(p) {
  // Moderator: 0=none, 1=mod, 2=elder mod
  const modLevel = Number(p.moderator) || 0;

  // Privacy settings
  // messages: "all"=0, "friends"=1, "off"=2
  const msgState = p.messages === 'all' ? 0 : p.messages === 'friends' ? 1 : 2;
  // friendRequests: true(allowed)=0, false(disabled)=1
  const frState = p.friendRequests === false ? 1 : 0;
  // commentHistory: "all"=0, "friends"=1, "off"=2
  const chState = p.commentHistory === 'all' ? 0 : p.commentHistory === 'friends' ? 1 : 2;

  // Icon data dari GDBrowser: p.iconData atau p.icon (bisa object atau number)
  // GDBrowser menyimpan icon sebagai: p.icon (cube), p.ship, p.ball, p.ufo, p.wave, p.robot, p.spider
  // Fallback ke 1 jika tidak ada
  const cube    = p.icon    || 1;
  const ship    = p.ship    || 1;
  const ball    = p.ball    || 1;
  const ufo     = p.ufo     || 1;
  const wave    = p.wave    || 1;
  const robot   = p.robot   || 1;
  const spider  = p.spider  || 1;
  const swing   = p.swing   || 1;
  const jetpack = p.jetpack || 1;

  // Warna: GDBrowser pakai color1/color2 sebagai angka index warna GD
  const color1 = p.color1 !== undefined ? p.color1 : 0;
  const color2 = p.color2 !== undefined ? p.color2 : 3;
  const color3 = p.color3 !== undefined ? p.color3 : 0; // glow color

  // Stats: pastikan semua diambil dari field yang benar di GDBrowser
  // GDBrowser profile fields: stars, demons, coins (secret), userCoins, diamonds, moons, cp (creatorPoints)
  const stars      = p.stars      || 0;
  const demons     = p.demons     || 0;
  const coins      = p.coins      || 0;       // secret/normal coins
  const userCoins  = p.userCoins  || 0;
  const diamonds   = p.diamonds   || 0;
  const moons      = p.moons      || 0;
  const cp         = p.cp         || p.creatorPoints || 0;
  const rank       = p.rank       || 0;

  // Social — GDBrowser menyimpan sebagai channel ID / username langsung
  const youtube = p.youtube || '';
  const twitter = p.twitter || '';
  const twitch  = p.twitch  || '';

  // PENTING: Tidak ada key duplikat sama sekali!
  // Urutan sesuai GD protocol yang diharapkan klien
  const parts = [
    `1:${p.username}`,           // username (nama asli dari GDBrowser)
    `2:${p.playerID}`,           // playerID
    `16:${p.accountID}`,         // accountID
    `3:${stars}`,                // stars
    `4:${demons}`,               // demons
    `8:${cp}`,                   // creator points — field 8
    `13:${coins}`,               // secret coins
    `17:${userCoins}`,           // user coins
    `18:${diamonds}`,            // diamonds
    `46:${moons}`,               // moons (2.2)
    `10:${rank}`,                // global rank
    `12:${modLevel}`,            // moderator level (0/1/2) — field 12
    // Icon set — semua vehicle
    `21:${cube}`,                // cube
    `22:${ship}`,                // ship
    `23:${ball}`,                // ball
    `24:${ufo}`,                 // ufo
    `25:${wave}`,                // wave
    `26:${robot}`,               // robot
    `27:${spider}`,              // spider
    `43:${swing}`,               // swing copter (2.2)
    `53:${jetpack}`,             // jetpack (2.2)
    // Warna
    `28:${color1}`,              // color1 — field 28 di beberapa client
    `29:${color2}`,              // color2
    `30:${color3}`,              // glow color
    // Cosmetics
    `48:${p.trail       || 0}`,  // trail
    `49:${p.deathEffect || 0}`,  // death effect
    // Privacy settings
    `50:${msgState}`,            // message setting
    `51:${frState}`,             // friend request setting
    `52:${chState}`,             // comment history
    // Social
    `38:${youtube}`,             // youtube channel ID
    `39:${twitter}`,             // twitter username
    `40:${twitch}`,              // twitch username
    // Flags
    `31:1`,                      // registered
    `44:0`,                      // banned flag
    `47:${p.demonList || 0}`,    // demon list flag
  ];

  return parts.join(':');
}

// ── getGJAccountComments20 ───────────────────────────────────
// DIPERBAIKI: format GD untuk profile comments
// Protocol: setiap comment = "userName:playerID:2:content_b64:4:likes:9:date:6:commentID"
// Dipisah dengan "|", diakhiri "#total:page:perPage"
// Untuk elder mod (level 2): tambahkan field moderator color (~7~0,102,255) di bagian user
// Format lengkap: "userName:playerID~content~likes~commentID~date~accountID~color"
// Sebenarnya GD pakai dua bagian dipisah "~":
//   bagian kiri  = user info (field : dipisah)
//   bagian kanan = comment data (field : dipisah)
// Tapi untuk getGJAccountComments20, format lebih sederhana:
// "2~<content_b64>~3~<playerID>~4~<likes>~9~<date>~6~<commentID>~10~<percent>~11~<accountID>~12~<moderatorBadge>"
function formatProfileComments(comments, profile) {
  if (!comments || !Array.isArray(comments) || comments.length === 0) return '-1';

  const modLevel = Number((profile && profile.moderator) || 0);

  const formatted = comments.map((c, i) => {
    const content  = b64(c.content || '');
    const likes    = c.likes    || 0;
    const date     = c.timeAgo  || c.date || c.age || '1 day ago';
    const cID      = c.ID       || c.id   || (10000 + i);
    const pID      = (profile && profile.playerID)  || c.playerID  || '0';
    const aID      = (profile && profile.accountID) || c.accountID || '0';

    // Field 12 di comment = moderator badge (0=none, 1=mod, 2=elder)
    // Elder mod (2) → warna komentar biru di game
    let parts = `2~${content}~3~${pID}~4~${likes}~9~${date}~6~${cID}~11~${aID}~12~${modLevel}`;
    return parts;
  });

  const total = comments.length;
  return `${formatted.join('|')}#${total}:0:10`;
}

// ── getGJLevelComments21 ─────────────────────────────────────
// DIPERBAIKI: format GD untuk level comments
// Format per comment: dua bagian dipisah "~":
//   bagian comment: "2~<content_b64>~3~<playerID>~4~<likes>~9~<date>~6~<commentID>~10~<percent>"
//   bagian user:    "1~<username>~9~<icon>~10~<color1>~11~<color2>~14~<iconType>~15~<glow>~16~<accountID>"
// Keduanya digabung dengan ":" lalu entry dipisah "|"
// Akhiri dengan "#page:total:perPage"
// Tanda "X" (commentBanned/silang) muncul kalau field spam (index 7) = 1
// Kita set 0 supaya tidak ada tanda silang kecuali memang spam
function formatLevelComments(comments) {
  if (!comments || !Array.isArray(comments) || comments.length === 0) return '-1';

  const formatted = comments.map((c, i) => {
    const content   = b64(c.content  || '');
    const username  = c.username     || 'Player';
    const playerID  = c.playerID     || String(i + 1);
    const accountID = c.accountID    || c.playerID || String(i + 1);
    const likes     = c.likes        || 0;
    const date      = c.timeAgo      || c.date || c.age || '1 day ago';
    const cID       = c.ID           || c.id   || (20000 + i);
    const percent   = c.percent      || 0;
    const icon      = c.icon         || 1;
    const color1    = c.color1       !== undefined ? c.color1 : 0;
    const color2    = c.color2       !== undefined ? c.color2 : 3;
    const iconType  = c.iconType     || 0;
    const glow      = c.glow         ? 1 : 0;
    const modLevel  = Number(c.moderator || 0);

    // Comment part
    const commentPart = `2~${content}~3~${playerID}~4~${likes}~9~${date}~6~${cID}~10~${percent}~7~0~11~${accountID}~12~${modLevel}`;
    // User part
    const userPart    = `1~${username}~9~${icon}~10~${color1}~11~${color2}~14~${iconType}~15~${glow}~16~${accountID}`;

    return `${commentPart}:${userPart}`;
  });

  const total = comments.length;
  return `${formatted.join('|')}#0:${total}:10`;
}

// ── getGJLevels21 ────────────────────────────────────────────
function difficultyNum(lv) {
  if (lv.auto)  return 0;
  if (lv.demon) return 6;
  const map = { 'N/A': 0, 'Easy': 1, 'Normal': 2, 'Hard': 3, 'Harder': 4, 'Insane': 5 };
  return map[lv.difficulty] !== undefined ? map[lv.difficulty] : 0;
}

function demonDiffNum(lv) {
  if (!lv.demon) return 0;
  const d = lv.difficulty || '';
  if (d.includes('Easy'))    return 1;
  if (d.includes('Medium'))  return 2;
  if (d.includes('Insane'))  return 4;
  if (d.includes('Extreme')) return 5;
  return 3;
}

function formatLevels(levels) {
  if (!levels || (Array.isArray(levels) && levels.length === 0)) return '-1';
  const arr = Array.isArray(levels) ? levels : [levels];
  if (arr.length === 0) return '-1';

  const formatted = arr.map((lv) => [
    `1:${lv.id || 0}`,
    `2:${lv.name || 'Unknown'}`,
    `5:${lv.version || 1}`,
    `6:${lv.playerID || 0}`,
    `8:10`,
    `9:${difficultyNum(lv)}`,
    `10:${lv.downloads || 0}`,
    `11:${lv.completions || 0}`,
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
  ].join(':'));

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

// ── getGJScores20 (leaderboard) ─────────────────────────────
// DIPERBAIKI: GDBrowser /leaderboard hanya support top stars
// Untuk type lain fallback ke top leaderboard
function formatLeaderboard(scores) {
  if (!scores || scores.length === 0) return '-1';
  const arr = Array.isArray(scores) ? scores : [scores];
  const formatted = arr.map((s, i) => [
    `1:${s.username  || 'Player'}`,
    `2:${s.playerID  || i + 1}`,
    `3:${s.stars     || 0}`,
    `6:${s.rank      || i + 1}`,
    `7:${s.icon      || 1}`,
    `8:0`,
    `9:${s.icon      || 1}`,
    `10:${s.color1   !== undefined ? s.color1 : 0}`,
    `11:${s.color2   !== undefined ? s.color2 : 3}`,
    `13:${s.coins    || 0}`,
    `14:${s.iconType || 0}`,
    `15:0`,
    `16:${s.accountID || i + 1}`,
    `46:${s.moons    || 0}`,
  ].join(':'));
  return formatted.join('|');
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  const rawPath = req.url || '';
  const path    = rawPath.split('?')[0];
  const body    = await getBody(req);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── loginGJAccount.php ──────────────────────────────────────
  if (path.includes('loginGJAccount')) {
    const username = body.userName || body.username || '';
    if (!username) return res.status(200).send('-1');

    const profile = await gbFetch(`/profile/${encodeURIComponent(username)}`);
    if (!profile || typeof profile !== 'object') return res.status(200).send('-1');

    // Format: accountID,playerID — nama asli dari GDBrowser sudah tersimpan di profile
    return res.status(200).send(formatLogin(profile));
  }

  // ── getGJUserInfo20.php ─────────────────────────────────────
  // DIPERBAIKI: selalu gunakan nama asli dari GDBrowser (case-sensitive)
  // GD mengirim targetAccountID untuk lihat profil orang lain
  // GD mengirim accountID + userName untuk lihat profil sendiri
  if (path.includes('getGJUserInfo20')) {
    const targetID = body.targetAccountID || '';
    const selfID   = body.accountID       || '';
    const userName = body.str             || '';

    let profile = null;

    if (targetID) {
      // Lihat profil orang lain berdasarkan accountID
      // GDBrowser bisa resolve accountID langsung
      profile = await gbFetch(`/profile/${encodeURIComponent(targetID)}`);
    } else if (userName) {
      // Cari berdasarkan username
      profile = await gbFetch(`/profile/${encodeURIComponent(userName)}`);
    } else if (selfID) {
      // Profil sendiri
      profile = await gbFetch(`/profile/${encodeURIComponent(selfID)}`);
    }

    if (!profile || typeof profile !== 'object') return res.status(200).send('-1');

    return res.status(200).send(formatUserInfo(profile));
  }

  // ── updateGJUserScore22.php ─────────────────────────────────
  if (path.includes('updateGJUserScore22')) {
    return res.status(200).send(body.accountID || '0');
  }

  // ── getGJAccountComments20.php ──────────────────────────────
  // DIPERBAIKI:
  //   1. Resolve username dari accountID menggunakan /profile/<id>
  //   2. Fetch comments dari /comments/<username>?type=profile
  //   3. Format dengan benar termasuk accountID dan moderator badge
  if (path.includes('getGJAccountComments20')) {
    const accountID = body.accountID || '';
    const page      = parseInt(body.page || '0', 10);

    if (!accountID) return res.status(200).send('-1');

    // Step 1: Ambil profile untuk dapat username asli dan data mod
    const profile = await gbFetch(`/profile/${encodeURIComponent(accountID)}`);
    if (!profile || typeof profile !== 'object') return res.status(200).send('-1');

    const username = profile.username;
    if (!username) return res.status(200).send('-1');

    // Step 2: Fetch profile comments dengan username asli
    // GDBrowser endpoint: /comments/<username>?type=profile&count=10&page=N
    const comments = await gbFetch(
      `/comments/${encodeURIComponent(username)}?type=profile&count=10&page=${page}`
    );

    // Step 3: Format dan kembalikan
    return res.status(200).send(formatProfileComments(comments, profile));
  }

  // ── getGJComments21.php (level comments) ───────────────────
  // DIPERBAIKI: format dua bagian (comment + user) dengan separator yang benar
  // Tanda "X" (silang) muncul kalau field spam=1, kita set 0 agar tidak muncul
  if (path.includes('getGJComments21')) {
    const levelID = body.levelID || '';
    const page    = parseInt(body.page || '0', 10);
    const mode    = body.mode || '0'; // 0=most liked, 1=recent

    if (!levelID) return res.status(200).send('-1');

    // mode=1 (recent) → top=false, mode=0 (liked) → default
    const sortParam = mode === '1' ? '&top=false' : '';
    const comments  = await gbFetch(
      `/comments/${encodeURIComponent(levelID)}?count=20&page=${page}${sortParam}`
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

  // ── getGJDailyLevel.php ─────────────────────────────────────
  // DIPERBAIKI: GDBrowser /daily mengembalikan { id, timeLeft }
  // Format GD yang diharapkan: "<levelID>|<timeLeft>"
  if (path.includes('getGJDailyLevel')) {
    const isWeekly = body.weekly === '1' || body.type === '1';
    const endpoint = isWeekly ? '/daily?weekly=1' : '/daily';

    const data = await gbFetch(endpoint);
    if (!data) return res.status(200).send('-1');

    let id = 0, timeLeft = 86400;

    if (typeof data === 'object' && data !== null) {
      // GDBrowser mengembalikan { id: N, timeLeft: N }
      id       = data.id       || data.levelID || 0;
      timeLeft = data.timeLeft || 86400;
    } else {
      id = parseInt(String(data), 10) || 0;
    }

    if (!id) return res.status(200).send('-1');

    return res.status(200).send(`${id}|${timeLeft}`);
  }

  // ── getSaveData.php ─────────────────────────────────────────
  if (path.includes('getSaveData')) {
    return res.status(200).send('');
  }

  // ── getGJSongInfo.php ───────────────────────────────────────
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

  // ── getGJLevels21.php ───────────────────────────────────────
  // DIPERBAIKI:
  //   type=5 (my levels / by user) → gunakan /profile/<user>/levels di GDBrowser
  //   type=21/22 (daily/weekly)    → fetch level data dari ID daily/weekly
  //   type=0 (search)              → /search/<str>
  //   type lain                    → /search/* dengan parameter type yang sesuai
  if (path.includes('getGJLevels21')) {
    const type      = body.type      || '0';
    const str       = body.str       || '';
    const page      = parseInt(body.page || '0', 10);
    const accountID = body.accountID || '';

    let levels   = null;
    let endpoint = '';

    switch (type) {
      case '0': // search by name atau ID
        if (str) {
          endpoint = `/search/${encodeURIComponent(str)}?count=10&page=${page}`;
        } else {
          endpoint = `/search/*?type=recent&count=10&page=${page}`;
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

      case '5': // by user (my online levels / user levels)
        // DIPERBAIKI: GDBrowser pakai /search/<accountID>?type=byuser
        {
          const uid = str || accountID;
          if (uid) {
            // Coba resolve username dulu karena GDBrowser butuh username di beberapa kasus
            const prof = await gbFetch(`/profile/${encodeURIComponent(uid)}`);
            if (prof && prof.username) {
              endpoint = `/search/${encodeURIComponent(prof.username)}?type=byuser&count=10&page=${page}`;
            } else {
              endpoint = `/search/${encodeURIComponent(uid)}?type=byuser&count=10&page=${page}`;
            }
          }
        }
        break;

      case '6': // featured
        endpoint = `/search/*?type=featured&count=10&page=${page}`;
        break;

      case '7': // magic
        endpoint = `/search/*?type=magic&count=10&page=${page}`;
        break;

      case '11': // awarded (rated)
        endpoint = `/search/*?type=awarded&count=10&page=${page}`;
        break;

      case '16': // hall of fame
        endpoint = `/search/*?type=hallofFame&count=10&page=${page}`;
        break;

      case '21': // daily level — ambil level data dari ID harian
        {
          const dailyData = await gbFetch('/daily');
          if (dailyData) {
            const dailyID = (typeof dailyData === 'object') ? (dailyData.id || dailyData.levelID) : parseInt(String(dailyData), 10);
            if (dailyID) {
              const lv = await gbFetch(`/level/${dailyID}`);
              if (lv) levels = Array.isArray(lv) ? lv : [lv];
            }
          }
        }
        break;

      case '22': // weekly level — ambil level data dari ID mingguan
        {
          const weeklyData = await gbFetch('/daily?weekly=1');
          if (weeklyData) {
            const weeklyID = (typeof weeklyData === 'object') ? (weeklyData.id || weeklyData.levelID) : parseInt(String(weeklyData), 10);
            if (weeklyID) {
              const lv = await gbFetch(`/level/${weeklyID}`);
              if (lv) levels = Array.isArray(lv) ? lv : [lv];
            }
          }
        }
        break;

      default:
        endpoint = `/search/*?type=recent&count=10&page=${page}`;
    }

    // Fetch jika endpoint sudah ditentukan dan levels belum di-fetch
    if (!levels && endpoint) {
      const raw = await gbFetch(endpoint);
      if (raw) {
        // GDBrowser bisa return { data: [...], found: N } atau langsung array
        if (Array.isArray(raw)) {
          levels = raw;
        } else if (raw.data && Array.isArray(raw.data)) {
          levels = raw.data;
        } else if (typeof raw === 'object' && raw.id) {
          levels = [raw]; // single level object
        }
      }
    }

    return res.status(200).send(formatLevels(levels));
  }

  // ── downloadGJLevel22.php ───────────────────────────────────
  if (path.includes('downloadGJLevel22')) {
    const levelID = body.levelID || '';
    if (!levelID) return res.status(200).send('-1');

    const lv = await gbFetch(`/level/${encodeURIComponent(levelID)}`);
    if (!lv || typeof lv !== 'object') return res.status(200).send('-1');

    const parts = [
      `1:${lv.id || levelID}`,
      `2:${lv.name || 'Unknown'}`,
      `3:${lv.description ? b64(lv.description) : ''}`,
      `4:${lv.data || lv.levelData || ''}`,
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

  // ── getGJScores20.php (leaderboard) ─────────────────────────
  // DIPERBAIKI: GDBrowser hanya punya /leaderboard untuk top stars
  // type=0: top stars, type lain: fallback ke top stars juga
  if (path.includes('getGJScores20')) {
    const type  = body.type  || '0';
    const count = body.count || '100';

    // GDBrowser hanya mendukung top leaderboard, creators tidak ada
    // type=3 (creators) → /leaderboard?type=creators kalau ada, atau fallback
    let endpoint = `/leaderboard?count=${count}`;
    if (type === '3') {
      endpoint = `/leaderboard?count=${count}&type=creators`;
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
