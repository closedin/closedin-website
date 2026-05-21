// /api/verify-email — closed:in free email verifier
// Validates a list of emails via 4 layers, no external API credits:
//   1. Syntax (RFC 5322 simplified regex)
//   2. Disposable provider check (open-source list, bundled)
//   3. Role-based detection (info@, sales@, etc)
//   4. MX record check (Node DNS lookup)
//
// Catches ~70-80% of bad emails. Not a replacement for SMTP-grade tools,
// but useful as a first-pass cleanup with zero credit cost.
//
// Rate limit: 500 emails per request.

const dns = require('dns').promises;

// Disposable provider domains - common throwaway/temp email services.
// Subset of github.com/disposable/disposable-email-domains (open source).
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '20minutemail.com', '33mail.com',
  'anonbox.net', 'anonymbox.com', 'beefmilk.com', 'bigprofessor.so',
  'binkmail.com', 'bobmail.info', 'boximail.com', 'bsnow.net',
  'btcmail.pw', 'bumpymail.com', 'casualdx.com', 'chacuo.net',
  'clickme1.com', 'cmail.club', 'cmail.com.au', 'cmail.de',
  'cnamed.com', 'consumerriot.com', 'cool.fr.nf', 'correo.blogos.net',
  'cosmorph.com', 'courriel.fr.nf', 'crapmail.org', 'cubiclink.com',
  'curryworld.de', 'dacoolest.com', 'daintly.com', 'dandikmail.com',
  'dayrep.com', 'dbunker.com', 'deadaddress.com', 'deadspam.com',
  'deagot.com', 'dealja.com', 'deekayen.us', 'delayload.com',
  'delayload.net', 'despam.it', 'despammed.com', 'devnullmail.com',
  'dfgh.net', 'digitalsanctuary.com', 'discard.email', 'discard.fr.nf',
  'discardmail.com', 'discardmail.de', 'discartmail.com', 'disposable.cc',
  'disposable.email', 'disposable.li', 'disposableemailaddresses.com',
  'disposableinbox.com', 'dispose.it', 'disposeamail.com', 'disposemail.com',
  'dispostable.com', 'divermail.com', 'dm.w3internet.co.uk', 'dodgeit.com',
  'dodgit.com', 'doiea.com', 'domozmail.com', 'donemail.ru',
  'dontmail.net', 'dontreg.com', 'dontsendmespam.de', 'dotmsg.com',
  'drdrb.com', 'drdrb.net', 'droplar.com', 'dropmail.me',
  'dudmail.com', 'duk33.com', 'dumpandjunk.com', 'dumpmail.de',
  'dump-email.info', 'dumpyemail.com', 'duskmail.com', 'e-mail.com',
  'e-mail.org', 'easytrashmail.com', 'einrot.com', 'einrot.de',
  'eintagsmail.de', 'email60.com', 'emailisvalid.com', 'emaillime.com',
  'emailmiser.com', 'emailo.pro', 'emailproxsy.com', 'emailresort.com',
  'emailsensei.com', 'emailspam.com', 'emailtemporanea.com', 'emailtemporanea.net',
  'emailtemporario.com.br', 'emailto.de', 'emailtmp.com', 'emailwarden.com',
  'emailxfer.com', 'emailz.ga', 'emz.net', 'enterto.com',
  'ephemail.net', 'evopo.com', 'examplemail.com', 'explodemail.com',
  'fake-mail.com', 'fake-mail.net', 'fakeinformation.com', 'fakemailgenerator.com',
  'fakemail.fr', 'fakemailz.com', 'fastacura.com', 'fastchevy.com',
  'fastchrysler.com', 'fastkawasaki.com', 'fastmazda.com', 'fastmitsubishi.com',
  'fastnissan.com', 'fastsubaru.com', 'fastsuzuki.com', 'fasttoyota.com',
  'fastyamaha.com', 'fightallspam.com', 'filzmail.com', 'fixmail.tk',
  'fizmail.com', 'fleckens.hu', 'fleshlightpopular.com', 'flyspam.com',
  'foobarbot.net', 'footard.com', 'forgetmail.com', 'forspam.net',
  'fr33mail.info', 'frapmail.com', 'fr.nf', 'front14.org',
  'fudgerub.com', 'fuirio.com', 'fux0ringduh.com', 'fyii.de',
  'garliclife.com', 'gehensiemirnichtaufdensack.de', 'get1mail.com', 'get2mail.fr',
  'getairmail.com', 'getmails.eu', 'getmailspring.com', 'getnada.com',
  'getonemail.com', 'getonemail.net', 'ghosttexter.de', 'giantmail.de',
  'girlsundertheinfluence.com', 'gishpuppy.com', 'gmial.com', 'goemailgo.com',
  'gorenter.com', 'gotmail.com', 'gotmail.net', 'gotmail.org',
  'gotti.otherinbox.com', 'great-host.in', 'greensloth.com', 'grr.la',
  'gsrv.co.uk', 'guerillamail.biz', 'guerillamail.com', 'guerillamail.de',
  'guerillamail.info', 'guerillamail.net', 'guerillamail.org', 'guerillamailblock.com',
  'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info',
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com', 'gustr.com',
  'h.mintemail.com', 'h8s.org', 'haltospam.com', 'hartbot.de',
  'hat-geld.de', 'hatespam.org', 'hellodream.mobi', 'herp.in',
  'hidemail.de', 'hidzz.com', 'hmamail.com', 'hopemail.biz',
  'hot-mail.cf', 'hot-mail.ga', 'hot-mail.gq', 'hot-mail.ml',
  'hot-mail.tk', 'hotpop.com', 'hulapla.de', 'ieatspam.eu',
  'ieatspam.info', 'ieh-mail.de', 'imails.info', 'imgof.com',
  'imgv.de', 'incognitomail.com', 'incognitomail.net', 'incognitomail.org',
  'infocom.zp.ua', 'inoutmail.de', 'inoutmail.eu', 'inoutmail.info',
  'inoutmail.net', 'insorg-mail.info', 'instant-mail.de', 'ip6.li',
  'ipoo.org', 'irish2me.com', 'iwi.net', 'jetable.com',
  'jetable.fr.nf', 'jetable.net', 'jetable.org', 'jnxjn.com',
  'jourrapide.com', 'jsrsolutions.com', 'junk1e.com', 'kasmail.com',
  'kaspop.com', 'keepmymail.com', 'killmail.com', 'killmail.net',
  'klassmaster.com', 'klassmaster.net', 'klzlk.com', 'koszmail.pl',
  'kurzepost.de', 'l33r.eu', 'labetteraverouge.at', 'lackmail.net',
  'lags.us', 'landmail.co', 'lastmail.co', 'lazyinbox.com',
  'letthemeatspam.com', 'lhsdv.com', 'lifebyfood.com', 'link2mail.net',
  'litedrop.com', 'loadby.us', 'login-email.cf', 'login-email.ga',
  'login-email.ml', 'login-email.tk', 'lol.ovpn.to', 'lookugly.com',
  'lopl.co.cc', 'lortemail.dk', 'lr78.com', 'lroid.com',
  'lukop.dk', 'm21.cc', 'maboard.com', 'mail-filter.com',
  'mail-temporaire.fr', 'mail.by', 'mail.mezimages.net', 'mail.zp.ua',
  'mail114.net', 'mail1a.de', 'mail21.cc', 'mail2rss.org',
  'mail333.com', 'mail4trash.com', 'mailbidon.com', 'mailbiz.biz',
  'mailblocks.com', 'mailbox72.biz', 'mailbucket.org', 'mailcatch.com',
  'mailde.de', 'mailde.info', 'maildrop.cc', 'maildx.com',
  'maileater.com', 'maileimer.de', 'mailexpire.com', 'mailfa.tk',
  'mailfreeonline.com', 'mailfreeway.com', 'mailguard.me', 'mailhazard.com',
  'mailhazard.us', 'mailhz.me', 'mailimate.com', 'mailin8r.com',
  'mailinater.com', 'mailinator.com', 'mailinator.net', 'mailinator2.com',
  'mailincubator.com', 'mailismagic.com', 'mailme.lv', 'mailme24.com',
  'mailmetrash.com', 'mailmoat.com', 'mailms.com', 'mailnator.com',
  'mailnesia.com', 'mailnull.com', 'mailorg.org', 'mailpick.biz',
  'mailrock.biz', 'mailsac.com', 'mailscrap.com', 'mailshell.com',
  'mailsiphon.com', 'mailslapping.com', 'mailtemp.info', 'mailtome.de',
  'mailtothis.com', 'mailtrash.net', 'mailtv.net', 'mailtv.tv',
  'mailzilla.com', 'mailzilla.org', 'makemetheking.com', 'manybrain.com',
  'mbx.cc', 'meantinc.com', 'meinspamschutz.de', 'meltmail.com',
  'messagebeamer.de', 'mezimages.net', 'mierdamail.com', 'mintemail.com',
  'mjukglass.nu', 'mobi.web.id', 'moburl.com', 'mohmal.com',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'monumentmail.com',
  'msa.minsmail.com', 'mt2009.com', 'mt2014.com', 'mt2015.com',
  'mycard.net.ua', 'mycleaninbox.net', 'myemail.io', 'mymail-in.net',
  'mymailoasis.com', 'mynetstore.de', 'mypartyclip.de', 'myphantomemail.com',
  'mysamp.de', 'myspaceinc.com', 'myspaceinc.net', 'myspaceinc.org',
  'myspamless.com', 'mytempemail.com', 'mytempmail.com', 'mytrashmail.com',
  'nabuma.com', 'neomailbox.com', 'nepwk.com', 'nervmich.net',
  'nervtmich.net', 'netmails.com', 'netmails.net', 'netzidiot.de',
  'neverbox.com', 'nice-4u.com', 'nincsmail.com', 'nincsmail.hu',
  'nm7.cc', 'nmail.cf', 'nnh.com', 'no-spam.ws',
  'noblepioneer.com', 'nobulk.com', 'noclickemail.com', 'nogmailspam.info',
  'nomail.pw', 'nomail.xl.cx', 'nomail2me.com', 'nomorespamemails.com',
  'nospam.ze.tc', 'nospam4.us', 'nospamfor.us', 'nospammail.net',
  'notmailinator.com', 'notsharingmy.info', 'nowmymail.com', 'nurfuerspam.de',
  'objectmail.com', 'obobbo.com', 'odnorazovoe.ru', 'oneoffemail.com',
  'oneoffmail.com', 'onlatedotcom.info', 'online.ms', 'oopi.org',
  'ordinaryamerican.net', 'otherinbox.com', 'ovpn.to', 'owlpic.com',
  'pancakemail.com', 'pjjkp.com', 'plexolan.de', 'poczta.onet.pl',
  'politikerclub.de', 'poofy.org', 'pookmail.com', 'pp.ua',
  'privacy.net', 'privatdemail.net', 'privymail.de', 'proxymail.eu',
  'prtnx.com', 'putthisinyourspamdatabase.com', 'pwrby.com', 'quickinbox.com',
  'rcpt.at', 'recode.me', 'recursor.net', 'reliable-mail.com',
  'rhyta.com', 'rmqkr.net', 'rppkn.com', 'rtrtr.com',
  's0ny.net', 'safe-mail.net', 'safersignup.de', 'safetymail.info',
  'safetypost.de', 'sandelf.de', 'saynotospams.com', 'schafmail.de',
  'schrott-email.de', 'secretemail.de', 'secure-mail.biz', 'selfdestructingmail.com',
  'sendspamhere.com', 'shieldedmail.com', 'shiftmail.com', 'shitmail.de',
  'shitmail.me', 'shitware.nl', 'shortmail.net', 'sibmail.com',
  'sinnlos-mail.de', 'siteposter.net', 'skeefmail.com', 'slaskpost.se',
  'slopsbox.com', 'slushmail.com', 'smashmail.de', 'smellfear.com',
  'smellrear.com', 'snakemail.com', 'sneakemail.com', 'sneakmail.de',
  'snkmail.com', 'sofimail.com', 'sofort-mail.de', 'sogetthis.com',
  'soodonims.com', 'spam.la', 'spam.su', 'spamavert.com',
  'spambob.com', 'spambob.net', 'spambob.org', 'spambog.com',
  'spambog.de', 'spambog.net', 'spambog.ru', 'spambox.info',
  'spambox.irishspringrealty.com', 'spambox.us', 'spamcannon.com', 'spamcannon.net',
  'spamcero.com', 'spamcon.org', 'spamcorptastic.com', 'spamcowboy.com',
  'spamcowboy.net', 'spamcowboy.org', 'spamday.com', 'spamex.com',
  'spamfree.eu', 'spamfree24.com', 'spamfree24.de', 'spamfree24.eu',
  'spamfree24.info', 'spamfree24.net', 'spamfree24.org', 'spamgoes.in',
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org', 'spamherelots.com',
  'spamhereplease.com', 'spamhole.com', 'spamify.com', 'spaml.com',
  'spaml.de', 'spammotel.com', 'spamobox.com', 'spamoff.de',
  'spamslicer.com', 'spamspot.com', 'spamthis.co.uk', 'spamthisplease.com',
  'spamtrail.com', 'spamtroll.net', 'speed.1s.fr', 'spoofmail.de',
  'squizzy.de', 'startkeys.com', 'stinkefinger.net', 'stop-my-spam.com',
  'stuffmail.de', 'super-auswahl.de', 'supergreatmail.com', 'supermailer.jp',
  'superrito.com', 'superstachel.de', 'suremail.info', 'svk.jp',
  'sweetxxx.de', 'tafmail.com', 'tagyourself.com', 'talkinator.com',
  'tapchicuoihoi.com', 'teewars.org', 'teleworm.com', 'teleworm.us',
  'tempail.com', 'tempalias.com', 'tempe-mail.com', 'tempemail.biz',
  'tempemail.co.za', 'tempemail.com', 'tempemail.net', 'tempinbox.co.uk',
  'tempinbox.com', 'tempmail.de', 'tempmail.eu', 'tempmail.it',
  'tempmail2.com', 'tempmaildemo.com', 'tempmailer.com', 'tempmailer.de',
  'tempomail.fr', 'temporarily.de', 'temporarioemail.com.br', 'temporaryemail.net',
  'temporaryforwarding.com', 'temporaryinbox.com', 'temporarymailaddress.com', 'tempsky.com',
  'tempthe.net', 'tempymail.com', 'thanksnospam.info', 'thankyou2010.com',
  'thecloudindex.com', 'thelimestones.com', 'thisisnotmyrealemail.com', 'thismail.net',
  'throwam.com', 'throwawayemailaddress.com', 'throwawaymail.com', 'tilien.com',
  'tittbit.in', 'tizi.com', 'tmail.ws', 'tmailinator.com',
  'toiea.com', 'tokem.co', 'topranklist.de', 'tradermail.info',
  'trash-amil.com', 'trash-mail.at', 'trash-mail.com', 'trash-mail.de',
  'trash2009.com', 'trash2010.com', 'trash2011.com', 'trashdevil.com',
  'trashemail.de', 'trashinbox.com', 'trashmail.at', 'trashmail.com',
  'trashmail.de', 'trashmail.me', 'trashmail.net', 'trashmail.org',
  'trashmail.ws', 'trashmailer.com', 'trashymail.com', 'trashymail.net',
  'trbvm.com', 'trialmail.de', 'trillianpro.com', 'tyldd.com',
  'uggsrock.com', 'umail.net', 'upliftnow.com', 'uplipht.com',
  'venompen.com', 'veryrealemail.com', 'vidchart.com', 'viewcastmedia.com',
  'viewcastmedia.net', 'viewcastmedia.org', 'vipxm.net', 'vomoto.com',
  'vsimcard.com', 'vubby.com', 'wasteland.rfc822.org', 'webemail.me',
  'webm4il.info', 'webuser.in', 'wee.my', 'wegwerf-email-addressen.de',
  'wegwerf-emails.de', 'wegwerfadresse.de', 'wegwerfemail.com', 'wegwerfemail.de',
  'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net', 'wegwerfmail.org',
  'wh4f.org', 'whatpaas.com', 'whyspam.me', 'willhackforfood.biz',
  'willselfdestruct.com', 'winemaven.info', 'wronghead.com', 'wuzup.net',
  'wuzupmail.net', 'www.e4ward.com', 'www.gishpuppy.com', 'www.mailinator.com',
  'wwwnew.eu', 'xagloo.com', 'xemaps.com', 'xents.com',
  'xmaily.com', 'xoxy.net', 'yapped.net', 'yeah.net',
  'yep.it', 'yogamaven.com', 'yomail.info', 'yopmail.com',
  'yopmail.fr', 'yopmail.net', 'yourdomain.com', 'ypmail.webarnak.fr.eu.org',
  'yuurok.com', 'z1p.biz', 'za.com', 'zehnminuten.de',
  'zehnminutenmail.de', 'zetmail.com', 'zippymail.info', 'zoaxe.com',
  'zoemail.net', 'zomg.info'
]);

const ROLE_PREFIXES = new Set([
  'info', 'sales', 'support', 'contact', 'admin', 'help', 'office',
  'team', 'hello', 'hi', 'no-reply', 'noreply', 'donotreply',
  'billing', 'invoice', 'accounts', 'accounting', 'finance',
  'marketing', 'press', 'media', 'pr', 'legal', 'compliance',
  'careers', 'jobs', 'recruitment', 'hr', 'people', 'talent',
  'webmaster', 'postmaster', 'abuse', 'security'
]);

// RFC 5322 simplified - good enough for 99% of real emails
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

async function checkMx(domain) {
  try {
    const records = await dns.resolveMx(domain);
    if (records && records.length > 0) {
      records.sort((a, b) => a.priority - b.priority);
      return { hasMx: true, mxRecord: records[0].exchange };
    }
    return { hasMx: false, mxRecord: null };
  } catch (err) {
    return { hasMx: false, mxRecord: null, error: err.code };
  }
}

async function verifyOne(rawEmail) {
  const email = (rawEmail || '').trim().toLowerCase();
  const result = {
    email,
    status: 'unknown',
    reasons: [],
    syntax: false,
    disposable: false,
    role: false,
    mx: false,
  };

  if (!email) {
    result.status = 'invalid';
    result.reasons.push('empty');
    return result;
  }

  // 1. Syntax check
  if (!EMAIL_REGEX.test(email)) {
    result.status = 'invalid';
    result.reasons.push('bad syntax');
    return result;
  }
  result.syntax = true;

  const [localPart, domain] = email.split('@');

  // 2. Disposable check
  if (DISPOSABLE_DOMAINS.has(domain)) {
    result.disposable = true;
    result.status = 'invalid';
    result.reasons.push('disposable domain');
    return result;
  }

  // 3. Role-based check (flag, not fail)
  const localBase = localPart.split('+')[0]; // strip +tag
  if (ROLE_PREFIXES.has(localBase)) {
    result.role = true;
    result.reasons.push('role-based');
  }

  // 4. MX check
  const mxResult = await checkMx(domain);
  if (!mxResult.hasMx) {
    result.status = 'invalid';
    result.reasons.push('no mx record');
    return result;
  }
  result.mx = true;
  result.mxRecord = mxResult.mxRecord;

  // If we got here: syntax OK, not disposable, MX exists
  if (result.role) {
    result.status = 'risky';
  } else {
    result.status = 'valid';
  }
  return result;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const emails = Array.isArray(body.emails) ? body.emails : [];

    if (emails.length === 0) {
      res.status(400).json({ error: 'No emails provided' });
      return;
    }

    if (emails.length > 500) {
      res.status(400).json({ error: 'Maximum 500 emails per request' });
      return;
    }

    // Verify all in parallel with concurrency limit (avoid DNS rate limits)
    const concurrency = 20;
    const results = [];
    for (let i = 0; i < emails.length; i += concurrency) {
      const batch = emails.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(verifyOne));
      results.push(...batchResults);
    }

    const stats = {
      total: results.length,
      valid: results.filter(r => r.status === 'valid').length,
      risky: results.filter(r => r.status === 'risky').length,
      invalid: results.filter(r => r.status === 'invalid').length,
    };

    res.status(200).json({ stats, results });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed', detail: err.message });
  }
};
