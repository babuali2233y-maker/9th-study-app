let token=localStorage.getItem("ix_token");
let user=null, questions=[], quizIndex=0, answers=[];
let timerSeconds=1500,timerId=null;

const $=id=>document.getElementById(id);
const api=async(url,opts={})=>{
  opts.headers={...(opts.headers||{}), "Content-Type":"application/json"};
  if(token) opts.headers.Authorization="Bearer "+token;
  const r=await fetch(url,opts);
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Request failed");
  return data;
};

async function init(){
  if(!token) return showAuth();
  try{
    user=(await api("/api/me")).user;
    showApp();
  }catch{localStorage.removeItem("ix_token");token=null;showAuth();}
}

function showAuth(){
  $("authView").classList.remove("hidden");
  $("mainView").classList.add("hidden");
  $("logout").classList.add("hidden");
}

async function showApp(){
  $("authView").classList.add("hidden");
  $("mainView").classList.remove("hidden");
  $("logout").classList.remove("hidden");
  $("welcome").textContent=user.name;
  if(user.role==="admin") $("adminCard").classList.remove("hidden");
  await Promise.all([loadSubjects(),loadNotes(),loadQuestions(),loadProgress()]);
}

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  const register=btn.dataset.mode==="register";
  $("name").classList.toggle("hidden",!register);
  $("authSubmit").textContent=register?"Create Account":"Login";
});

$("authForm").onsubmit=async e=>{
  e.preventDefault();
  const register=!$("name").classList.contains("hidden");
  try{
    const data=await api(register?"/api/auth/register":"/api/auth/login",{
      method:"POST",body:JSON.stringify({
        name:$("name").value,email:$("email").value,password:$("password").value
      })
    });
    token=data.token;user=data.user;localStorage.setItem("ix_token",token);
    $("authMsg").textContent="";
    showApp();
  }catch(err){$("authMsg").textContent=err.message;}
};

$("logout").onclick=()=>{
  localStorage.removeItem("ix_token");token=null;location.reload();
};

async function loadSubjects(){
  const subjects=await api("/api/subjects");
  $("subjects").innerHTML=subjects.map(s=>`
    <button class="subject" onclick="loadChapterNotes(${s.id})">
      <span style="font-size:26px">${s.icon}</span>
      <b>${escapeHtml(s.name)}</b>
      <small>View chapters</small>
    </button>`).join("");
  $("adminSubject").innerHTML=subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
}

async function loadChapterNotes(id){
  const chapters=await api(`/api/subjects/${id}/chapters`);
  $("notes").innerHTML=`<h3>Chapters</h3>`+chapters.map(c=>`<div class="note"><b>${escapeHtml(c.title)}</b></div>`).join("");
  const notes=await api(`/api/notes?subject_id=${id}`);
  if(notes.length) $("notes").innerHTML+=notes.map(noteHtml).join("");
}

async function loadNotes(){
  const notes=await api("/api/notes");
  $("notes").innerHTML=notes.length?notes.map(noteHtml).join(""):"<p>No notes yet. Admin can add notes.</p>";
}

function noteHtml(n){
  return `<article class="note"><small>${escapeHtml(n.subject)}${n.chapter?" • "+escapeHtml(n.chapter):""}</small><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.content)}</p></article>`;
}

async function loadQuestions(){
  questions=await api("/api/questions");
  $("quizInfo").textContent=`${questions.length} questions available`;
}

function startQuiz(){
  if(!questions.length)return alert("No questions available.");
  quizIndex=0;answers=[];renderQuestion();
}

function renderQuestion(){
  const q=questions[quizIndex];
  $("quiz").innerHTML=`<div class="quizQ">${quizIndex+1}/${questions.length}. ${escapeHtml(q.question)}</div>`+
    ["option_a","option_b","option_c","option_d"].map((k,i)=>
      `<button class="option" onclick="answerQuiz(${i},this)">${escapeHtml(q[k])}</button>`).join("");
}

async function answerQuiz(i,btn){
  const q=questions[quizIndex];
  document.querySelectorAll(".option").forEach(x=>x.disabled=true);
  answers.push({question_id:q.id,answer:i});
  try{
    const result=await api("/api/questions"); // answer key is intentionally not exposed
    // Visual feedback is handled by a server-scored final result.
  }catch{}
  quizIndex++;
  if(quizIndex<questions.length)setTimeout(renderQuestion,250);
  else setTimeout(finishQuiz,250);
}

async function finishQuiz(){
  const result=await api("/api/quizzes/submit",{method:"POST",body:JSON.stringify({answers})});
  $("quiz").innerHTML=`<div class="card"><h2>🎉 Quiz Complete</h2><div class="timer">${result.score}/${result.total}</div><button class="primary" onclick="startQuiz()">Try Again</button></div>`;
  $("bestScore").textContent=Math.round(result.score/result.total*100)+"%";
}

async function loadProgress(){
  const p=await api("/api/progress");
  $("bestScore").textContent=(p.quiz.best||0)+"%";
}

$("startQuiz").onclick=startQuiz;

function startTimer(){
  if(timerId)return;
  timerId=setInterval(()=>{
    if(timerSeconds<=0){pauseTimer();alert("Study session complete! 🎉");return;}
    timerSeconds--;renderTimer();
  },1000);
}
function pauseTimer(){clearInterval(timerId);timerId=null}
function resetTimer(){pauseTimer();timerSeconds=1500;renderTimer()}
function renderTimer(){
  $("timer").textContent=String(Math.floor(timerSeconds/60)).padStart(2,"0")+":"+String(timerSeconds%60).padStart(2,"0");
}

$("showAdmin").onclick=()=>$("adminForm").classList.toggle("hidden");

$("addNote").onclick=async()=>{
  try{
    await api("/api/admin/notes",{method:"POST",body:JSON.stringify({
      subject_id:+$("adminSubject").value,title:$("noteTitle").value,content:$("noteContent").value
    })});
    $("adminMsg").textContent="Note saved.";
    $("noteTitle").value="";$("noteContent").value="";
    loadNotes();
  }catch(e){$("adminMsg").textContent=e.message;}
};

$("addQuestion").onclick=async()=>{
  try{
    await api("/api/admin/questions",{method:"POST",body:JSON.stringify({
      subject_id:+$("adminSubject").value,
      question:$("qText").value,
      options:[$("oa").value,$("ob").value,$("oc").value,$("od").value],
      answer:+$("qAnswer").value
    })});
    $("adminMsg").textContent="Question saved.";
    await loadQuestions();
    ["qText","oa","ob","oc","od"].forEach(id=>$(id).value="");
  }catch(e){$("adminMsg").textContent=e.message;}
};

function escapeHtml(v){
  return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

renderTimer();
init();
