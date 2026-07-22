/*
 * Interactive practice components, shared across lessons. Styles live in practice.css.
 *
 * Everything here is progressive enhancement: with JS off, answers and feedback are
 * simply visible. That is deliberate — a lesson you cannot read is worse than a lesson
 * you cannot click.
 *
 * ---------------------------------------------------------------------------
 * <div class="recall" data-recall>
 *   <p class="recall__prompt"><strong>From memory</strong> …question…</p>
 *   <div class="recall__answer">…answer…</div>
 * </div>
 *
 * <div class="check" data-check>
 *   <p class="check__q">…question…</p>
 *   <div class="check__options">
 *     <button class="check__opt" data-correct>…</button>
 *     <button class="check__opt">…</button>
 *   </div>
 *   <div class="check__feedback">…why…</div>
 * </div>
 *
 * <p class="score" data-score>… <b data-score-value></b> …</p>
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict'

  /* --- Recall: cover the answer, reveal on demand -------------------------- */

  document.querySelectorAll('[data-recall]').forEach(function (recall) {
    var answer = recall.querySelector('.recall__answer')
    if (!answer) return

    answer.hidden = true

    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'recall__reveal'
    button.textContent = recall.dataset.recall || 'Show me'
    button.setAttribute('aria-expanded', 'false')

    button.addEventListener('click', function () {
      answer.hidden = false
      button.setAttribute('aria-expanded', 'true')
      button.remove()
    })

    var prompt = recall.querySelector('.recall__prompt')
    if (prompt) prompt.insertAdjacentElement('afterend', button)
    else recall.insertBefore(button, answer)
  })

  /* --- Check: pick an answer, get told immediately ------------------------- */

  var asked = 0
  var rightFirstTime = 0

  document.querySelectorAll('[data-check]').forEach(function (check) {
    var options = Array.prototype.slice.call(check.querySelectorAll('.check__opt'))
    var feedback = check.querySelector('.check__feedback')
    if (!options.length) return

    asked++
    if (feedback) feedback.hidden = true

    options.forEach(function (option) {
      option.type = 'button'

      option.addEventListener('click', function () {
        var correct = option.hasAttribute('data-correct')

        option.setAttribute('data-picked', '')
        option.setAttribute('data-verdict', correct ? 'right' : 'wrong')

        // Surface the right answer whenever a wrong one was picked, so a miss still
        // teaches rather than just marking.
        if (!correct) {
          options.forEach(function (other) {
            if (other.hasAttribute('data-correct')) other.setAttribute('data-reveal', '')
          })
        } else {
          rightFirstTime++
        }

        options.forEach(function (other) { other.disabled = true })
        if (feedback) feedback.hidden = false

        updateScore()
      })
    })
  })

  /* --- Score: how many landed first time ----------------------------------- */

  var answered = 0
  document.querySelectorAll('[data-check]').forEach(function (check) {
    check.addEventListener('click', function (event) {
      if (event.target.classList && event.target.classList.contains('check__opt')) answered++
    }, { capture: true, once: true })
  })

  function updateScore() {
    document.querySelectorAll('[data-score-value]').forEach(function (slot) {
      slot.textContent = rightFirstTime + ' of ' + asked
    })
  }

  updateScore()
})()
