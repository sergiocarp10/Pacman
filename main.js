import Board from "./classes/board.js"
import Ghost from "./classes/ghost.js"
import Match from "./classes/match.js"
import Pacman from "./classes/pacman.js"

// HTML elements
const canvas = document.getElementById("canvas")
const canvasContext = canvas.getContext("2d")

const pacmanImgs = Array(4)
for (let i=0; i<4; i++) pacmanImgs[i] = document.getElementById(`pacman${i}`)

const pacmanClosedImg = document.getElementById("pacman_closed")
const eyesImg = document.getElementById("eyes")
const levelTxt = document.getElementById("level_txt")
const scoreTxt = document.getElementById("score_txt")
const scaredImg = document.getElementById("scared")
const scared2Img = document.getElementById("scared2")

const liveImgs = Array(3)
for (let i=0; i<liveImgs.length; i++) liveImgs[i] = document.getElementById(`live${i+1}`)

const ghostImgsV2 = Array(4)
for (let i=0; i<ghostImgsV2.length; i++) ghostImgsV2[i] = document.getElementById(`ghost${i}`)

// Constants
const BOARD_WIDTH = 28
const BOARD_HEIGHT = 31
const CELL_SIZE = 20
const GHOST_IMAGE_SIZE = 100
const FOOD_RADIUS = CELL_SIZE / 6
const WALL_OFFSET = 0.25
const PACMAN_TICK_PERIOD = [3, 3, 2, 2]
const GHOST_TICK_PERIOD = [3, 3, 2, 2]
const LIVES_START = 2
const LEVEL_START = 1
const LEVEL_COMPLETED_DELAY = 2000
const START_GAME_DELAY = 400

// Global variables
const match = new Match(LIVES_START, LEVEL_START, LEVEL_COMPLETED_DELAY)
const board = new Board(BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, FOOD_RADIUS, WALL_OFFSET, match)
const pacman = new Pacman(board, pacmanImgs, pacmanClosedImg)

const ghostEntities = Array(4)
for (let i=0; i<4; i++) ghostEntities[i] = new Ghost(eyesImg, scaredImg, scared2Img, i % 4, board, pacman)

board.setGhosts(ghostEntities)

let ticks = 0
let ticks_general = 0

// Setup
const setup = () => {
    resetGame()
    
    // Keyboard listener
    document.addEventListener("keydown", e => {
        if (match.isPlaying()){
            if ((e.key === "w" || e.key === "ArrowUp") && pacman.direction != 0) pacman.moveUp()
            else if ((e.key === "s" || e.key === "ArrowDown") && pacman.direction != 3) pacman.moveDown()
            else if ((e.key === "a" || e.key === "ArrowLeft") && pacman.direction != 1) pacman.moveLeft()
            else if ((e.key === "d" || e.key === "ArrowRight") && pacman.direction != 2) pacman.moveRight()
        }
    })
}

const resetGame = () => {
    board.reset()
    pacman.reset()
    match.reset()
    ghostEntities.forEach(g => g.reset())

    match.stopGhostSiren()
    match.start()
}

// Loop
const gameLoop = () => {
    canvasContext.clearRect(0,0,canvas.width, canvas.height)
    board.draw(canvasContext, Math.floor(ticks_general++ / 10))

    if (match.isPlaying()){
        let entity_level = match.getEntityLevel()

        ghostEntities.forEach(g => g.moveIfTicks(GHOST_TICK_PERIOD[entity_level]))

        if (++ticks >= PACMAN_TICK_PERIOD[entity_level]){
            pacman.moveAuto()
            ticks = 0
        }
    } else if (match.status === match.statusList.EATING_GHOST){
        canvasContext.font = "16px Arial"
        canvasContext.fillStyle = "cyan"
        canvasContext.fillText(`${match.getPointsByGhostEaten()}`, (pacman.x - 0.2) * CELL_SIZE, (pacman.y - 0.6) * CELL_SIZE)
    }

    ghostEntities.forEach((g, index) => {
        if (g.checkPacmanCollision()){
            if (g.canKillPacman()){
                match.loseLive(pacman)
                ghostEntities.forEach(g => g.reset())

                if (match.lives === 0) setTimeout(() => resetGame(), 3000)
            } else if (g.canBeEaten()){
                g.eat()
                ghostEntities.forEach(g2 => g2.increaseScareDuration(500))
                match.addPointsByGhostEat()
                new Audio("sounds/eat_ghost.mp3").play()
            }
        }
    })

    if (!board.checkExistFood()){
        board.foodCount = 9999
        match.nextLevel(pacman, ghostEntities, board)        
    }

    pacman.draw(canvasContext, CELL_SIZE)

    if (match.status != match.statusList.LOSING) ghostEntities.forEach((g, index) => {
        let imgSource = ghostImgsV2[index]
        g.draw(canvasContext, CELL_SIZE, GHOST_IMAGE_SIZE, match.isPlaying(), imgSource)
    })

    liveImgs.forEach((img, i) => img.style.visibility = match.shouldShow(i+1) ? 'visible' : 'hidden')
    levelTxt.innerText = "Level " + match.level
    scoreTxt.innerText = "Score: " + match.score
}

// Main program
setTimeout(() => {
    setup()
    setInterval(gameLoop, 20);  
}, START_GAME_DELAY);

