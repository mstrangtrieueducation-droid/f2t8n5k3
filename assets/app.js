
const cfg=window.TEST_CONFIG;
const gate=document.querySelector('#studentGate');
const studentForm=document.querySelector('#studentForm');
const testForm=document.querySelector('#testForm');
const root=document.querySelector('#exerciseRoot');
const results=document.querySelector('#results');
const review=document.querySelector('#review');
const jump=document.querySelector('#sectionJump');
let student=null;
const allItems=cfg.units.flatMap(unit=>unit.exercises.flatMap(exercise=>exercise.items));
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9']/g,' ').replace(/\s+/g,' ').trim();
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

studentForm.addEventListener('submit',event=>{
  event.preventDefault();
  const name=document.querySelector('#studentName').value.trim();
  const className=document.querySelector('#studentClass').value;
  if(!name||!className)return;
  student={name,className};
  localStorage.setItem('student-profile',JSON.stringify(student));
  gate.hidden=true;
});
try{const saved=JSON.parse(localStorage.getItem('student-profile'));if(saved?.name)document.querySelector('#studentName').value=saved.name;if(saved?.className)document.querySelector('#studentClass').value=saved.className}catch{}

cfg.units.forEach(unit=>{
  const nav=document.createElement('button');nav.type='button';nav.textContent='Unit '+unit.unit;nav.addEventListener('click',()=>document.querySelector('#unit-'+unit.unit).scrollIntoView({behavior:'smooth'}));jump.appendChild(nav);
  const unitSection=document.createElement('section');unitSection.className='unit-block';unitSection.id='unit-'+unit.unit;
  unitSection.innerHTML='<header class="unit-heading"><div><small>'+cfg.short+'</small><h2>Unit '+unit.unit+'</h2></div><b>15 câu</b></header><div class="unit-exercises"></div>';
  const unitRoot=unitSection.querySelector('.unit-exercises');
  unit.exercises.forEach(exercise=>{
    const section=document.createElement('section');section.className='exercise';section.id='unit-'+unit.unit+'-exercise-'+exercise.number;
    const reference=exercise.reference
      ? '<details class="source-reference" open><summary>Hình và yêu cầu của phần '+exercise.number+'</summary><div><img loading="lazy" src="../'+exercise.reference+'" alt="Unit '+unit.unit+', phần '+exercise.number+' của đề gốc"><p>Con quan sát hình và đọc đúng yêu cầu, sau đó làm từng câu ngay bên dưới.</p></div></details>'
      : '';
    const wordBank=exercise.wordBank?.length
      ? '<div class="word-bank"><b>Word bank</b>'+exercise.wordBank.map(word=>'<span>'+escapeHtml(word)+'</span>').join('')+'</div>'
      : '';
    section.innerHTML='<header><span>'+exercise.number+'</span><div><small>UNIT '+unit.unit+' · PHẦN '+exercise.number+'</small><h2>'+escapeHtml(exercise.title)+'</h2></div><b>/'+exercise.items.length+'</b></header>'+wordBank+reference+
      '<div class="items">'+exercise.items.map(item=>renderItem(item)).join('')+'</div>';
    unitRoot.appendChild(section);
  });
  root.appendChild(unitSection);
});

function renderItem(item){
  const control=item.type==='choice'
    ? '<div class="choices">'+item.options.map((option,index)=>{const value=typeof option==='object'?option.value:option;const label=typeof option==='object'?option.label:option;return '<button type="button" data-value="'+escapeHtml(value)+'" aria-pressed="false"><span>'+String.fromCharCode(65+index)+'</span><b>'+escapeHtml(label)+'</b></button>'}).join('')+'</div>'
    : '<input autocomplete="off" spellcheck="false" placeholder="Nhập câu trả lời">';
  const body=item.visual
    ? '<div class="picture-task"><div class="question-picture"><img loading="lazy" src="../'+item.visual+'" alt="Hình cho câu '+item.sourceNumber+'"></div><div class="picture-answer"><p>'+escapeHtml(item.prompt)+'</p>'+control+'</div></div>'
    : '<p>'+escapeHtml(item.prompt)+'</p>'+control;
  return '<article class="item '+(item.visual?'picture-item':'')+'" data-id="'+item.id+'"><span class="item-number">'+item.sourceNumber+'</span><div class="item-body">'+body+'</div></article>';
}

root.addEventListener('click',event=>{
  const button=event.target.closest('.choices button');if(!button)return;
  const item=button.closest('.item');item.querySelectorAll('.choices button').forEach(option=>{const selected=option===button;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',selected?'true':'false')});item.dataset.value=button.dataset.value;item.classList.remove('missing');updateProgress();
});
root.addEventListener('input',event=>{if(!event.target.matches('input'))return;event.target.closest('.item').classList.remove('missing');updateProgress()});

function answerFor(item){return item.type==='choice'?(document.querySelector('[data-id="'+item.id+'"]')?.dataset.value||''):(document.querySelector('[data-id="'+item.id+'"] input')?.value||'')}
function updateProgress(){const done=allItems.filter(item=>norm(answerFor(item))).length;document.querySelector('#progressText').textContent=done+' / '+cfg.total;document.querySelector('#progressBar').style.width=(done/cfg.total*100)+'%';cfg.units.forEach((unit,index)=>{const items=unit.exercises.flatMap(exercise=>exercise.items);const count=items.filter(item=>norm(answerFor(item))).length;jump.children[index].classList.toggle('has-progress',count>0);jump.children[index].classList.toggle('complete',count===items.length)})}

testForm.addEventListener('submit',event=>{
  event.preventDefault();
  document.querySelectorAll('.item.missing').forEach(item=>item.classList.remove('missing'));
  const missing=allItems.filter(item=>!norm(answerFor(item)));
  if(missing.length){missing.forEach(item=>document.querySelector('[data-id="'+item.id+'"]').classList.add('missing'));document.querySelector('#submitHelp').textContent='Bài còn thiếu '+missing.length+' câu. Con hoàn thành phần được đánh dấu trước khi xem đáp án.';document.querySelector('[data-id="'+missing[0].id+'"]').scrollIntoView({behavior:'smooth',block:'center'});return}
  grade();
});

function grade(){
  let score=0;review.innerHTML='';
  allItems.forEach(item=>{const response=answerFor(item);const correct=item.answers.some(answer=>norm(answer)===norm(response));if(correct)score++;const card=document.createElement('article');card.className='review-card '+(correct?'correct':'wrong');card.innerHTML='<span>'+(correct?'✓':'×')+'</span><div><small>Unit '+item.unit+' · Câu '+item.sourceNumber+'</small><h3>'+escapeHtml(item.prompt)+'</h3><p>Con trả lời: <b>'+escapeHtml(response)+'</b></p><p>Đáp án: <b>'+escapeHtml(item.answers[0])+'</b></p><div class="explanation"><b>Giải thích</b><p>'+escapeHtml(item.explanation)+'</p></div></div>';review.appendChild(card)});
  document.querySelector('#scoreValue').textContent=score;document.querySelector('#scoreMessage').textContent=score===cfg.total?'Con đã làm đúng toàn bộ bài.':score>=36?'Con làm tốt. Hãy đọc kỹ phần giải thích ở những câu chưa đúng.':'Con hãy chữa từng câu chưa đúng rồi làm lại bài một lần nữa.';testForm.hidden=true;results.hidden=false;results.scrollIntoView({behavior:'smooth',block:'start'});recordScore(score);
}

function recordScore(score){
  const status=document.querySelector('#recordStatus');status.textContent='Đang ghi nhận kết quả...';
  const payload=new URLSearchParams();payload.set(cfg.form.fields.name,student?.name||'');payload.set(cfg.form.fields.className,student?.className||'');payload.set(cfg.form.fields.assignmentCode,cfg.assignmentCode);payload.set(cfg.form.fields.score,String(score));payload.set(cfg.form.fields.total,String(cfg.total));payload.set(cfg.form.fields.percent,String(Math.round(score/cfg.total*100)));
  fetch(cfg.form.endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:payload.toString()}).then(()=>status.textContent='Kết quả đã được ghi nhận.').catch(()=>status.textContent='Kết quả chưa thể tự động ghi nhận. Con báo cô để được hỗ trợ.');
}

document.querySelector('#restart').addEventListener('click',()=>window.location.reload());
updateProgress();
