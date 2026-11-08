const normalizeAnswer=value=>value.trim().toLocaleLowerCase('ru').replace(/ё/g,'е');

export function gradeAnswers(questions,answers) {
 const invalid=()=>Object.assign(new Error('Проверьте, что на каждый вопрос дан ответ.'),{status:400});
 if(!Array.isArray(answers)||answers.length!==questions.length)throw invalid();
 const feedback=questions.map((question,index)=>{
  const submitted=answers[index];
  if(!submitted||submitted.id!==question.id||typeof submitted.value!=='string'
    ||!submitted.value.trim()||submitted.value.length>3000
    ||question.type==='choice'&&!question.options.includes(submitted.value))throw invalid();
  const correct=question.type==='choice'
   ? submitted.value===question.answer
   : normalizeAnswer(submitted.value)===normalizeAnswer(question.answer);
  return {id:question.id,correct,answer:question.answer,explanation:question.explanation};
 });
 return {right:feedback.filter(item=>item.correct).length,total:questions.length,feedback};
}
