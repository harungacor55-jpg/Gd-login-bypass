export default async function handler(req, res) {
  // Ambil nama file saja dari URL
  const path = req.url;
  res.setHeader('Content-Type', 'text/plain');

  if (path.includes('loginGJAccount.js')) {
    return res.status(200).send('24863428,221912069');
  } 
  else if (path.includes('getGJUserInfo20.js')) {
    return res.status(200).send('1:Haroen:2:221912069:16:24863428:20:haroenlegend:21:1:22:1:23:1');
  }
  else if (path.includes('updateGJUserScore22.js')) {
    return res.status(200).send('221912069');
  }
  else if (path.includes('getGJAccountComments20.js')) {
    return res.status(200).send('2~SGVsbG8gR0Q=~3~221912069~4~1~9~1 day~6~12345');
  }
  else if (path.includes('getGJMessages20.js')) {
    return res.status(200).send('6:Haroen:3:221912069:2:999:1:999:4:aGVsbG8=:8:1:9:0:7:1 hour');
  }
  else if (path.includes('getGJUserList20.js')) {
    return res.status(200).send('1:Haroen:2:221912069:16:24863428');
  }
  else if (path.includes('getGJFriendRequests20.js')) {
    return res.status(200).send('1:FriendA:2:12345:35:YWRkIG1l:37:1 day');
  }
  else if (path.includes('getGJDailyLevel.js')) {
    return res.status(200).send('3474|51749');
  }
  else if (path.includes('getGJSongInfo.js')) {
    return res.status(200).send('1~|~100~|~2~|~MySong~|~4~|~AuthorName');
  }
  else if (path.includes('getGJLevels21.js')) {
    return res.status(200).send('1:123:2:LevelSatu:5:1:6:221912069');
  }
  else if (path.includes('uploadGJAccComment20.js')) {
    return res.status(200).send('66667777');
  }
  else if (path.includes('uploadGJComment21.js')) {
    return res.status(200).send('67676767');
  }
  else if (path.includes('uploadGJLevel21.js')) {
    return res.status(200).send('12345678');
  }
  else if (path.includes('updateGJAccSettings20.js')) {
    return res.status(200).send('1');
  }

  return res.status(200).send('-1');
}
