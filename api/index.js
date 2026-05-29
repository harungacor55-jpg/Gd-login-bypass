
export default async function handler(req, res) {
  const path = req.url;
  res.setHeader('Content-Type', 'text/plain');

  // --- AUTH & USER ---
  if (path.includes('loginGJAccount.js')) {
    return res.status(200).send('24863428,221912069'); // ID Account, UserID
  } 
  else if (path.includes('getGJUserInfo20.js')) {
    return res.status(200).send('1:Haroen:2:221912069:16:24863428:20:haroenlegend:21:1:22:1:23:1'); // Struktur user info dasar
  }
  else if (path.includes('updateGJUserScore22.js')) {
    return res.status(200).send('221912069'); // Sukses update
  }
  else if (path.includes('updateGJAccSettings20.js')) {
    return res.status(200).send('1'); // Sukses
  }

  // --- SOCIAL ---
  else if (path.includes('getGJAccountComments20.js')) {
    // 2~Base64Content~3~AccountID~4~Likes~9~Time~6~CommentID
    return res.status(200).send('2~SGVsbG8gR0Q=~3~221912069~4~1~9~1 day~6~12345'); 
  }
  else if (path.includes('getGJMessages20.js')) {
    // 6:Sender:3:AccountID:2:MessageID:1:MsgID:4:Base64Content:8:Read:9:New:7:Time
    return res.status(200).send('6:Haroen:3:221912069:2:999:1:999:4:aGVsbG8=:8:1:9:0:7:1 hour');
  }
  else if (path.includes('getGJUserList20.js')) {
    // 1:Username:2:AccountID:16:UserID
    return res.status(200).send('1:Haroen:2:221912069:16:24863428');
  }
  else if (path.includes('getGJFriendRequests20.js')) {
    // 1:Username:2:AccountID:35:Base64Msg:37:Time
    return res.status(200).send('1:FriendA:2:12345:35:YWRkIG1l:37:1 day');
  }

  // --- CONTENT ---
  else if (path.includes('getGJDailyLevel.js')) {
    return res.status(200).send('3474|51749'); // LevelID|SongID
  }
  else if (path.includes('getGJSongInfo.php')) {
    // 1~|~SongID~|~2~|~Name~|~4~|~Author
    return res.status(200).send('1~|~100~|~2~|~MySong~|~4~|~AuthorName');
  }
  else if (path.includes('getGJLevels21.php')) {
    // 1:LevelID:2:LevelName:5:Difficulty:6:AccountID
    return res.status(200).send('1:123:2:LevelSatu:5:1:6:221912069');
  }

  // --- ACTIONS ---
  else if (path.includes('uploadGJAccComment20.php')) return res.status(200).send('66667777');
  else if (path.includes('uploadGJComment21.php')) return res.status(200).send('67676767');
  else if (path.includes('uploadGJLevel21.php')) return res.status(200).send('12345678');

  return res.status(200).send('-1'); // Default error jika endpoint tidak terdaftar
}
