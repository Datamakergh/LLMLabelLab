// ===== 8. Coffee customer churn (text labels) =====
var TXT_TRAIN=[
 {t:'The fertiliser arrived two weeks late and half the bags were torn. I am thinking of buying from another supplier.',who:'Farmer, Nyeri',kw:['late','torn','another supplier'],sent:'neg',churn:'high',trap:''},
 {t:'Payment for my cherries came on time through M-Pesa. Thank you, I will deliver again next season.',who:'Cooperative member, Kiambu',kw:['on time','Thank you','deliver again'],sent:'pos',churn:'low',trap:''},
 {t:'How do I register my second plot with the cooperative?',who:'New farmer, Embu',kw:[],sent:'neu',churn:'low',trap:'A plain question. Nothing to tick.'},
 {t:'Great, another delayed pickup. Just great.',who:'Farmer, Murang’a',kw:['delayed'],sent:'neg',churn:'med',trap:'Sarcasm: “Great” is not praise here.'},
 {t:'Seedlings are healthy and the extension officer was helpful, but the price per kilo dropped again.',who:'Farmer, Kirinyaga',kw:['healthy','helpful','dropped'],sent:'neu',churn:'med',trap:'Mixed feelings: good service, bad price.'},
 {t:'I am not happy with the grading. They rejected my AA lot without explaining why.',who:'Farmer, Nyeri',kw:['not happy','rejected','without explaining'],sent:'neg',churn:'high',trap:''},
 {t:'Delivery was not late this time. Well done.',who:'Café buyer, Nairobi',kw:['not late','Well done'],sent:'pos',churn:'low',trap:'“not late” is positive. The word “late” alone is not.'},
 {t:'Please send me the 2026 price list for parchment.',who:'Café buyer, Nairobi',kw:[],sent:'neu',churn:'low',trap:'A request. Nothing to tick.'}];
var TXT_TEST=[
 {t:'The pickup was delayed twice and the bags were torn. I may switch supplier.',who:'Farmer, Meru',kw:['delayed','torn','switch supplier'],sent:'neg',churn:'high',trap:''},
 {t:'Thank you, the payment came on time again.',who:'Cooperative member, Thika',kw:['Thank you','on time'],sent:'pos',churn:'low',trap:''},
 {t:'The truck was not late today, well done.',who:'Farmer, Nyeri',kw:['not late','well done'],sent:'pos',churn:'low',trap:'Negation: “not late”.'},
 {t:'Please confirm the price list for Friday.',who:'Café buyer, Mombasa',kw:[],sent:'neu',churn:'low',trap:''}];
function tokenize(t){return t.match(/[A-Za-z0-9’'\-]+|[^\sA-Za-z0-9]/g)||[]}
function isWord(tok){return /[A-Za-z0-9]/.test(tok)}
function phraseIdx(tokens,phrase){
  var pt=tokenize(phrase).map(function(x){return x.toLowerCase()}),lt=tokens.map(function(x){return x.toLowerCase()}),o=[];
  for(var i=0;i+pt.length<=lt.length;i++){var ok=true;for(var j=0;j<pt.length;j++)if(lt[i+j]!==pt[j]){ok=false;break}if(ok){for(var k=0;k<pt.length;k++)o.push(i+k);break}}
  return o}
function genText(i,test){
  var m=(test?TXT_TEST:TXT_TRAIN)[i],tokens=tokenize(m.t),kw=[];
  m.kw.forEach(function(p){kw=kw.concat(phraseIdx(tokens,p))});
  return {text:m.t,who:m.who,tokens:tokens,gt:{kw:kw,sent:m.sent,churn:m.churn},trap:m.trap};
}
var SENT=[{id:'pos',name:'Positive',color:'#16a34a'},{id:'neu',name:'Neutral',color:'#64748b'},{id:'neg',name:'Negative',color:'#dc2626'}];
var CHURN=[{id:'low',name:'Low',color:'#16a34a'},{id:'med',name:'Medium',color:'#d97706'},{id:'high',name:'High',color:'#dc2626'}];
PROJECTS.push({
  id:'churn',name:'Coffee customer churn',icon:'💬',type:'text',tag:'Sentiment analysis',
  blurb:'Label farmer and buyer messages so a model can warn when a supplier is about to leave.',
  client:'A coffee supply company wants to know which customers are likely to stop buying. It reads messages from farmers and café buyers, and the model learns which words signal trouble from your labels.',
  source:'https://datamaker.io/ko/blog/articles/review/personalized-cosmetic-suggestions',
  classes:[{id:'pos',name:'Positive',color:'#16a34a',help:'Happy, thankful or praising.'},{id:'neu',name:'Neutral',color:'#64748b',help:'A question, a request, or mixed good and bad.'},{id:'neg',name:'Negative',color:'#dc2626',help:'Complaint, anger or a threat to leave.'}],
  guide:['First tick the words or phrases that carry the feeling. Tick a phrase like “not late” as one group.','Then choose the overall sentiment.','Then choose the churn risk: Low if they are staying, Medium if mixed, High if they say they may leave.','Sarcasm means the opposite of the words.','A plain question or request has no keywords. Choose Neutral and Low.'],
  traps:['Sarcasm: “Great, another delayed pickup.”','Negation: “not late” is good news.','Mixed feelings in one message.'],
  gigo:'If you tick “late” but not “not late”, the model reads a happy customer as an unhappy one and the call team phones the wrong people.',
  nTrain:8,nTest:4,gen:genText,
  tips:{pos:'Tick the whole phrase for negations such as “not late”.',neu:'Questions and requests have no keywords. Mixed messages are Neutral with Medium churn.',neg:'Tick the complaint words and “thinking of another supplier” as a threat to leave.'},
  reportTitle:'The call list the model would produce'
});
