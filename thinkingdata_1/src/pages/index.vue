<script setup lang="ts">
const { $taTrack } = useNuxtApp()

const canvas = ref()

const gameState = reactive({
  score: 0,
  lives: 1,
  totalScore: 0,
  challenge: 0,
  gameStarted: false,
  gameOver: false,
})

onMounted(() => {
  const ctx = canvas.value.getContext('2d')
  const ballRadius = 10
  let x = canvas.value.width / 2
  let y = canvas.value.height - 30
  let dx = 2
  let dy = -2
  const paddleHeight = 10
  const paddleWidth = 75
  let paddleX = (canvas.value.width - paddleWidth) / 2
  let rightPressed = false
  let leftPressed = false
  const brickRowCount = 5
  const brickColumnCount = 3
  const brickWidth = 75
  const brickHeight = 20
  const brickPadding = 10
  const brickOffsetTop = 30
  const brickOffsetLeft = 30

  let bricks = createBricks()

  document.addEventListener('keydown', keyDownHandler, false)
  document.addEventListener('keyup', keyUpHandler, false)
  document.addEventListener('mousemove', mouseMoveHandler, false)

  function createBricks() {
    const bricks = []
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = []
      for (let r = 0; r < brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 }
      }
    }
    return bricks
  }
  function keyDownHandler(e: any) {
    if (!gameState.gameStarted && e.code === 'Enter') {
      $taTrack('BricksGameStart', {
        extra_property: { hoge: 'fuga' },
      })
      gameState.gameStarted = true
      draw()
    }

    if (e.code === 'ArrowRight') {
      rightPressed = true
    } else if (e.code === 'ArrowLeft') {
      leftPressed = true
    }
  }
  function keyUpHandler(e: any) {
    if (e.code === 'ArrowRight') {
      rightPressed = false
    } else if (e.code === 'ArrowLeft') {
      leftPressed = false
    }
  }
  function mouseMoveHandler(e: any) {
    const relativeX = e.clientX - canvas.value.offsetLeft
    if (relativeX > 0 && relativeX < canvas.value.width) {
      paddleX = relativeX - paddleWidth / 2
    }
  }
  function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        const b = bricks[c][r]
        if (b.status === 1) {
          if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
            dy = -dy
            b.status = 0
            gameState.score++
            if (gameState.score === brickRowCount * brickColumnCount) {
              alert('YOU WIN, CONGRATS!')
              document.location.reload()
            }
          }
        }
      }
    }
  }

  function drawBall() {
    ctx.beginPath()
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#0095DD'
    ctx.fill()
    ctx.closePath()
  }
  function drawPaddle() {
    ctx.beginPath()
    ctx.rect(paddleX, canvas.value.height - paddleHeight, paddleWidth, paddleHeight)
    ctx.fillStyle = '#0095DD'
    ctx.fill()
    ctx.closePath()
  }
  function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        if (bricks[c][r].status === 1) {
          const brickX = r * (brickWidth + brickPadding) + brickOffsetLeft
          const brickY = c * (brickHeight + brickPadding) + brickOffsetTop
          bricks[c][r].x = brickX
          bricks[c][r].y = brickY
          ctx.beginPath()
          ctx.rect(brickX, brickY, brickWidth, brickHeight)
          ctx.fillStyle = '#0095DD'
          ctx.fill()
          ctx.closePath()
        }
      }
    }
  }
  function drawScore() {
    ctx.font = '16px Arial'
    ctx.fillStyle = '#0095DD'
    ctx.fillText('Score: ' + gameState.score, 8, 20)
  }
  function drawLives() {
    ctx.font = '16px Arial'
    ctx.fillStyle = '#0095DD'
    ctx.fillText('Lives: ' + gameState.lives, canvas.value.width - 65, 20)
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

    if (!gameState.gameStarted) {
      const text = 'Press Enter to Start'
      ctx.font = '30px Arial'
      const textWidth = ctx.measureText(text).width
      const textX = (canvas.value.width - textWidth) / 2
      const textY = canvas.value.height / 2

      ctx.fillStyle = '#0095DD'
      ctx.fillText(text, textX, textY)
      return
    }
    if (gameState.gameOver) {
      const text = 'Game Over'
      ctx.font = '30px Arial'
      const textWidth = ctx.measureText(text).width
      const textX = (canvas.value.width - textWidth) / 2
      const textY = canvas.value.height / 2

      ctx.fillStyle = '#0095DD'
      ctx.fillText(text, textX, textY)

      const text2 = 'Press Enter To Retry'
      const text2Width = ctx.measureText(text2).width
      const text2X = (canvas.value.width - text2Width) / 2

      ctx.fillText(text2, text2X, textY + 30)

      gameState.gameStarted = false
      gameState.gameOver = false

      gameState.totalScore += gameState.score
      gameState.challenge++

      $taTrack('BricksGameScore', {
        score: gameState.totalScore,
        challenge: gameState.challenge,
      })

      gameState.score = 0
      gameState.lives = 2
      bricks = createBricks()

      $taTrack('BricksGameOver', {
        extra_property: { hoge: 'fuga' },
      })

      return
    }

    drawBricks()
    drawBall()
    drawPaddle()
    drawScore()
    drawLives()
    collisionDetection()

    if (x + dx > canvas.value.width - ballRadius || x + dx < ballRadius) {
      dx = -dx
    }

    if (y + dy < ballRadius) {
      dy = -dy
    } else if (y + dy > canvas.value.height - ballRadius) {
      if (x > paddleX && x < paddleX + paddleWidth) {
        dy = -dy
      } else {
        gameState.lives--
        if (gameState.lives <= 0) {
          gameState.gameOver = true
        } else {
          x = canvas.value.width / 2
          y = canvas.value.height - 30
          dx = 2
          dy = -2
          paddleX = (canvas.value.width - paddleWidth) / 2
        }
      }
    }

    if (rightPressed && paddleX < canvas.value.width - paddleWidth) {
      paddleX += 7
    } else if (leftPressed && paddleX > 0) {
      paddleX -= 7
    }

    x += dx
    y += dy
    requestAnimationFrame(draw)
  }

  draw()
})
</script>

<template>
  <canvas ref="canvas" class="game-box" width="480" height="320"></canvas>
  <div>挑戦: {{ gameState.challenge }} 合計スコア: {{ gameState.totalScore }}</div>
</template>

<style lang="scss">
.game-box {
  border: 3px solid #ddd;
}
</style>
