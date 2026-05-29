export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  const path = req.url;
  
  // Ambil parameter dari request game (gunakan URLSearchParams untuk POST request)
  const body = req.body;
  const params = new URLSearchParams(body);
  const accountID = params.get('accountID') || '221912069'; // Default ID

  // --- AUTH ---
  if (path.includes('loginGJAccount.js')) {
    return res.status(200).send('24863428,221912069');
  }

  // --- DYNAMIC DATA (GDBrowser API) ---
  else if (path.includes('getGJUserInfo20.js')) {
    try {
      const response = await fetch(`https://gdbrowser.com/api/profile/${accountID}`);
      const data = await response.json();
      return res.status(200).send(`1:${data.username}:2:${data.accountID}:16:${data.playerID}:20:${data.username}:21:1:22:1:23:1:50:${data.stars}:51:${data.demons}`);
    } catch (e) {
      return res.status(200).send('1:Haroen:2:221912069:16:24863428:20:haroenlegend:21:1:22:1:23:1'); // Fallback
    }
  }

  else if (path.includes('getGJAccountComments20.js')) {
    try {
      const response = await fetch(`https://gdbrowser.com/api/comments/${accountID}`);
      const data = await response.json();
      if (data.length > 0) {
        const c = data[0];
        const contentB64 = Buffer.from(c.content).toString('base64');
        return res.status(200).send(`2~${contentB64}~3~${accountID}~4~${c.likes}~9~${c.date}~6~${c.commentID}`);
      }
      return res.status(200).send('-1');
    } catch (e) { return res.status(200).send('-1'); }
  }

  // --- STATIC / OTHER ENDPOINTS ---
  else if (path.includes('updateGJUserScore22.js')) return res.status(200).send('221912069');
  else if (path.includes('getGJMessages20.js')) return res.status(200).send('6:Haroen:3:221912069:2:999:1:999:4:aGVsbG8=:8:1:9:0:7:1 hour');
  else if (path.includes('getGJUserList20.js')) return res.status(200).send('1:Haroen:2:221912069:16:24863428');
  else if (path.includes('getGJFriendRequests20.js')) return res.status(200).send('1:FriendA:2:12345:35:YWRkIG1l:37:1 day');
  else if (path.includes('getGJDailyLevel.js')) return res.status(200).send('3474|51749');
  else if (path.includes('getGJSongInfo.js')) return res.status(200).send('1~|~100~|~2~|~MySong~|~4~|~AuthorName');
  else if (path.includes('getGJLevels21.js')) return res.status(200).send('1:123:2:LevelSatu:5:1:6:221912069');
  else if (path.includes('uploadGJAccComment20.js')) return res.status(200).send('66667777');
  else if (path.includes('uploadGJComment21.js')) return res.status(200).send('67676767');
  else if (path.includes('uploadGJLevel21.js')) return res.status(200).send('12345678');
  else if (path.includes('updateGJAccSettings20.js')) return res.status(200).send('1');

  return res.status(200).send('-1');
    }
