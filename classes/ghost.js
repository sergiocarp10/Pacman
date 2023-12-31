import Entity from "./entity.js"

export default class Ghost extends Entity {

    constructor(eyesImg, scareImg, scare2Img, number, board, pacman) {
        super(board, 11 + number + (number > 1 ? 2 : 0), 14, number % 3 ? 0 : 3)
        this.fullImg = eyesImg
        this.scareImg = scareImg
        this.scare2Img = scare2Img
        this.number = number
        this.pacman = pacman

        this.statusList = {
            NORMAL: 0,
            VULNERABLE: 1,
            EATEN: 2
        }

        this.reset()
    }

    reset(){
        super.reset()
        this.bounces = 0
        this.bounceLimit = 5 * (this.number + 1)
        this.inHouse = true
        this.status = this.statusList.NORMAL
        this.draw_ticks = 0

        if (this.vulnerableEndingIntervalId) clearInterval(this.vulnerableEndingIntervalId)
        if (this.vulnerableIntervalId) clearInterval(this.vulnerableIntervalId)

        this.vulnerableEndTs = -1
    }

    canMoveTo(x,y){
        const x_try = super.fixX(x)
        const y_try = super.fixY(y)
        let ok = this.board.canGhostMoveTo(x_try, y_try)

        // check tunnel
        super.checkTunnel()

        if (!ok) this.bounces++
        return ok
    }

    changeToRandomDirection(){
        let op1, op2

        switch (this.direction) {
            case 0:
            case 3:
                op1 = this.board.canGhostMoveTo(this.x-1, this.y)
                op2 = this.board.canGhostMoveTo(this.x+1, this.y)

                if (op1 && op2) {
                    if (this.isEaten()) this.rotateTowardsHouse()
                    else if (Math.random() < 0.4) this.direction = Math.random() < 0.5 ? 1 : 2
                    else if (this.isVulnerable()) this.direction = this.pacman.isToTheLeft(this.x) ? 2 : 1
                    else this.direction = this.pacman.isToTheLeft(this.x) ? 1 : 2
                } else if (op1) this.direction = 1
                else if (op2) this.direction = 2
                else this.goBackwards()
                break;
            case 1:
            case 2:
                op1 = this.board.canGhostMoveTo(this.x, this.y-1)
                op2 = this.board.canGhostMoveTo(this.x, this.y+1)

                if (op1 && op2) {
                    if (this.isEaten()) this.rotateTowardsHouse()
                    else if (Math.random() < 0.4) this.direction = Math.random() < 0.5 ? 0 : 3
                    else if (this.isVulnerable()) this.direction = this.pacman.isAbove(this.y) ? 3 : 0
                    else this.direction = this.pacman.isAbove(this.y) ? 0 : 3
                } else if (op1) this.direction = 0
                else if (op2) this.direction = 3
                else this.goBackwards()
                break;
        }
    }

    moveUp(){
        if (this.y == 14 && (this.x == 6 || this.x == 21)){
            if (this.isEaten()){
                this.rotateTowardsHouse()
            } else if (this.isVulnerable()){
                if (this.pacman.isAbove(this.y)) this.changeToRandomDirection()
                else super.moveUp()
            } else {
                if (this.pacman.isBelow(this.y)) this.changeToRandomDirection()
                else super.moveUp()
            }
        } else if (this.canMoveTo(this.x, this.y-0.5)){
            super.moveUp()
        } else {
            if (this.bounces < this.bounceLimit) this.direction = 3
            else {
                if (this.inHouse) {
                    this.direction = this.x < 14 ? 2 : 1
                    this.inHouse = false
                } else {
                    this.changeToRandomDirection()
                }
            }
        }
    }

    moveLeft(){
        if (this.isEaten() && this.x == 14 && this.y == 11){
            this.direction = 3
        } else if (this.x == 14 && this.y == 13){
            this.direction = 0
        } else if (this.canMoveTo(this.x-0.5, this.y)){
            super.moveLeft()
        } else {
            this.changeToRandomDirection()
        }
    }

    moveRight(){
        if (this.isEaten() && this.x == 14 && this.y == 11){
            this.direction = 3
        } else if (this.x == 13 && this.y == 13){
            this.direction = 0
        } else if (this.canMoveTo(this.x+0.5, this.y)){
            super.moveRight()
        } else this.changeToRandomDirection()
    }

    moveDown(){
        if (this.isEaten() && this.x == 14 && this.y == 14){
            this.unscare()
            this.direction = 0
        } else if (this.y == 14 && (this.x == 6 || this.x == 21)){
            if (this.isEaten()){
                this.rotateTowardsHouse()
            } else if (this.isVulnerable()){
                if (this.pacman.isBelow(this.y)) this.changeToRandomDirection()
                else super.moveDown()
            } else {
                if (this.pacman.isAbove(this.y)) this.changeToRandomDirection()
                else super.moveDown()
            }
        } else if (this.canMoveTo(this.x, this.y+0.5)){
            super.moveDown()
        } else {
            if (this.inHouse) this.direction = 0
            else this.changeToRandomDirection()
        }
    }

    teletransport(foodCount){
        if (foodCount < 12) {
            this.x = -4
            this.y = -4
        } else {
            super.nextTick()
            if (super.getTick() % 2 === 0){
                let coords = this.board.getRandomSpace(this.x, this.y, 2)
                this.x = coords[0]
                this.y = coords[1]
            }
        }        
    }

    moveIfTicks(levelTickPeriod){
        switch(this.status){
            case this.statusList.NORMAL:
                if (super.getTick() >= levelTickPeriod) this.moveAuto()
                break
            case this.statusList.VULNERABLE:
                if (super.getTick() >= levelTickPeriod + 1) this.moveAuto()
                break
            case this.statusList.EATEN:
                if (super.getTick()) this.moveAuto()
                break
        }

        super.nextTick()
    }

    moveAuto(){
        super.resetTicks()

        switch (this.direction) {
            case 0:
                this.moveUp()
                break;
            case 1:
                this.moveLeft()
                break;
            case 2:
                this.moveRight()
                break;
            case 3:
                this.moveDown()
                break;
        }

        // also check if vulnerable time ended
        if (this.isVulnerable() && this.vulnerableEndTs < Date.now()) this.unscare()
    }

    goBackwards(){
        switch (this.direction){
            case 0:
                this.direction = 3
                break
            case 1:
                this.direction = 2
                break
            case 2:
                this.direction = 1
                break
            case 3:
                this.direction = 0
                break
        }
    }

    goAwayFromPacman(){
        switch (this.direction){
            case 0:
                if (this.pacman.isAbove(this.y)) this.direction = 3
                break
            case 1:
                if (this.pacman.isToTheLeft(this.x)) this.direction = 2
                break
            case 2:
                if (this.pacman.isToTheRight(this.x)) this.direction = 1
                break
            case 3:
                if (this.pacman.isBelow(this.y)) this.direction = 0
                break
        }
    }

    goTowardsPacman(){
        switch (this.direction){
            case 0:
                if (this.pacman.isBelow(this.y)) this.direction = 3
                break
            case 1:
                if (this.pacman.isToTheRight(this.x)) this.direction = 2
                break
            case 2:
                if (this.pacman.isToTheLeft(this.x)) this.direction = 1
                break
            case 3:
                if (this.pacman.isAbove(this.y)) this.direction = 0
                break
        }
    }

    rotateTowardsHouse(){
        switch (this.direction){
            case 0:
            case 3:
                this.direction = super.isToTheLeft(14) ? 2 : 1
                break
            case 1:
            case 2:
                this.direction = super.isAbove(11) ? 3 : 0
                break
        }
    }

    scare(duration){
        // if ghost is already eaten, cannot be scared
        if (this.isEaten()) return

        this.status = this.statusList.VULNERABLE
        this.vulnerableEnding = false
        this.goAwayFromPacman()
        super.resetTicks()

        if (this.vulnerableEndingIntervalId) clearInterval(this.vulnerableEndingIntervalId)
        this.vulnerableEndingIntervalId = setTimeout(() => {
            this.vulnerableEnding = true
        }, duration * 0.8)

        this.vulnerableEndTs = Date.now() + duration
    }

    unscare(){
        this.status = this.statusList.NORMAL
        this.goTowardsPacman()
    }

    eat(){
        //this.reset()
        //this.bounces = 99
        this.status = this.statusList.EATEN
        this.goBackwards()
    }

    increaseScareDuration(ms_diff){
        this.vulnerableEndTs += ms_diff
    }

    checkPacmanCollision(){    
        switch (this.direction) {
            case 0:
            case 3:
                if (this.x != this.pacman.x) return false
                return this.y == this.pacman.y || super.fixedY() == this.pacman.y || this.y == this.pacman.fixedY()
            case 1:
            case 2:
                if (this.y != this.pacman.y) return false
                return this.x == this.pacman.x || super.fixedX() == this.pacman.x || this.x == this.pacman.fixedX()
        }

    }

    draw(context, cellSize, imageSize, increaseTicks, imgSource){
        if (this.isVulnerable()) {
            if (increaseTicks) this.draw_ticks++
            let variant = this.vulnerableEnding && (this.draw_ticks % 10 > 5)
            context.drawImage(variant ? this.scare2Img : this.scareImg, this.x * cellSize, this.y * cellSize, cellSize, cellSize)
        } else {
            if (this.status === this.statusList.NORMAL) this.drawNormalV2(context, imgSource, cellSize, imageSize)
            else this.drawNormalV1(context, cellSize, imageSize)
        }
    }

    drawNormalV1(context, cellSize, imageSize){
        const sw = imageSize, sh = imageSize, internalSize = 96
        let sx, sy

        switch (this.direction) {
            case 2:
                sx = 0
                sy = 0
                break;
            case 3:
                sx = internalSize
                sy = 0
                break
            case 0:
                sx = 0
                sy = internalSize
                break
            case 1:
                sx = internalSize
                sy = internalSize
                break;
        }

        context.drawImage(this.fullImg, sx, sy, sw, sh, this.x * cellSize, this.y * cellSize, cellSize * 1.2, cellSize * 1.2)
    }

    drawNormalV2(context, sourceImg, cellSize, imageSize){
        const sw = imageSize, sh = imageSize, internalSize = 96
        let sx, sy

        switch (this.direction) {
            case 2:
                sx = 0
                sy = 0
                break;
            case 3:
                sx = internalSize
                sy = 0
                break
            case 0:
                sx = 0
                sy = internalSize
                break
            case 1:
                sx = internalSize
                sy = internalSize
                break;
        }

        context.drawImage(sourceImg, sx, sy, sw, sh, this.x * cellSize, this.y * cellSize, cellSize * 1.2, cellSize * 1.2)
    }

    // ---- QUERIES -----------------------
    
    isVulnerable(){
        return this.status === this.statusList.VULNERABLE
    }

    isEaten(){
        return this.status === this.statusList.EATEN
    }

    canBeEaten(){
        return this.isVulnerable()
    }

    canKillPacman(){
        return this.status === this.statusList.NORMAL
    }
}