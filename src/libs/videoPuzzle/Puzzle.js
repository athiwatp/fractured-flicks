import {App} from './app.js'
import {puzzles} from '../../puzzles.config.js'
import {sounds} from '../../audio.config.js'
import {PuzzleMenu} from './PuzzleMenu.js'
import {Piece} from './Piece.js'
import {Button} from './Button.js'
import {TitleScreen} from './TitleScreen.js'

export class Puzzle extends App {
  constructor() {
    super()
    this.currentLevel = 1

    this.pieces = []
    this.menuScreen = undefined
    this.guide = undefined
    this.videoTex = undefined
    this.frame = undefined
    this.background = undefined
    this.titleText = undefined
    this.timerText = undefined
    this.backButton = undefined

    this.timerStartTime = 0
    this.timerNowTime = 0

    this.commonAssets = ['./images/frame.png', './images/background.png']
    this.videoURI = puzzles[this.currentLevel].file
    this.videoScale = 1
    this.numRows = puzzles[this.currentLevel].numRows
    this.numColumns = puzzles[this.currentLevel].numColumns
    this.soundURIs = sounds

    this.xOffset = 0
    this.yOffset = 0
    this.loadingNewLevel = true
    this.puzzleComplete = false

    this.startLocations = []
  }

  initGame() {
    this.initApp(this)

    let that = this

    this.loadTextures(this.commonAssets, () => {
      this.loadAudio(this.soundURIs, that.initGameSetup.bind(that))
    })
  }

  initGameSetup() {
    // Add background

    this.background = new PIXI.extras.TilingSprite(
      PIXI.utils.TextureCache["./images/background.png"],
      this.maxWidth,
      this.maxHeight
    )

    this.pixiApp.stage.addChild(this.background)

    let titleScreen = new TitleScreen(this)
    this.pixiApp.stage.addChild(titleScreen)

    this.soundResources['./sounds/music1.mp3'].loop = true
    this.soundResources['./sounds/music1.mp3'].play()

    this.registerInstance(this)
  }

  menuSetup() {
    // create menu screen
    this.menuScreen = new PuzzleMenu(this)
    this.pixiApp.stage.addChild(this.menuScreen)

    // create puzzle screen
    this.initPuzzleSetup()
    this.toggleUIVisibility(false)
  }

  initPuzzleSetup() {
    this.xOffset = (this.maxWidth - 853) / 2
    this.yOffset = (this.maxHeight - 480) / 2

    // Add frame
    this.frame = new PIXI.Sprite(PIXI.utils.TextureCache["./images/frame.png"])
    this.frame.pivot = new PIXI.Point(16,16)
    this.frame.x = this.xOffset
    this.frame.y = this.yOffset
    this.pixiApp.stage.addChild(this.frame)

    // Add Title
    let titleStyle = new PIXI.TextStyle({
      fontFamily: 'Indie Flower',
      fill: 'white'
    })

    this.titleText = new PIXI.Text("Title", titleStyle)
    this.titleText.x = 0
    this.titleText.y = 0
    this.titleText.displayGroup = this.uiLayer
    this.pixiApp.stage.addChild(this.titleText)

    this.timerText = new PIXI.Text("0:00", titleStyle)
    this.timerText.x = 200
    this.timerText.y = 0
    this.timerText.displayGroup = this.uiLayer
    this.pixiApp.stage.addChild(this.timerText)
  }

  loadLevel(level) {
    console.log("Changing Levels")

    // load new puzzle
    this.currentLevel = level
    this.videoURI = puzzles[this.currentLevel].file
    this.titleText.text = "Loading"
    this.puzzleComplete = false

    // if video isn't already in cache, load it
    if (!PIXI.loader.resources.hasOwnProperty(this.videoURI)) {
      this.loadTextures(this.videoURI, this.puzzleSetup.bind(this))
    } else {
      this.puzzleSetup()
    }
  } 

  puzzleSetup() {
    console.log("Setting up puzzle...")

    this.titleText.text = puzzles[this.currentLevel].name

    //let bw = new PIXI.filters.ColorMatrixFilter()
    this.videoTex = PIXI.Texture.fromVideo(PIXI.loader.resources[this.videoURI].data)
    this.videoTex.baseTexture.source.loop = true
    this.videoTex.baseTexture.source.play()
    this.guide = new PIXI.Sprite(this.videoTex)

    this.guide.x = this.xOffset
    this.guide.y = this.yOffset
    //guide.filters = [bw]
    this.guide.tint = 0x808080
    //bw.blackAndWhite()

    this.pixiApp.stage.addChild(this.guide)

    let cellWidth = this.guide.width / this.numColumns
    let cellHeight = this.guide.height / this.numRows

    let pieceWidth = cellWidth / this.numColumns * this.videoScale
    let pieceHeight = cellHeight / this.numRows * this.videoScale

    for (let i = 0; i < this.numRows; i++) {
      for (let j = 0; j < this.numColumns; j++) {

        let rect = new PIXI.Rectangle(j*cellWidth, i*cellHeight, cellWidth, cellHeight)
        let pieceTex = new PIXI.Texture(this.videoTex.baseTexture)
        pieceTex.frame = rect

        let pieceX = this.xOffset + (j+0.5)*(cellWidth * this.videoScale)
        let pieceY = this.yOffset + (i+0.5)*(cellHeight * this.videoScale)

        let newPiece = new Piece(pieceX, pieceY, pieceWidth, pieceHeight, cellWidth, cellHeight, pieceTex, this)
        newPiece.randomizePosition(this.xOffset - 50, 
                    this.yOffset - 50, 
                    this.xOffset + this.guide.width + 50,
                    this.yOffset + this.guide.height + 50)
        
        this.registerInstance(newPiece)
        this.pieces.push(newPiece)
        this.pixiApp.stage.addChild(newPiece)
      }
    }

    this.backButton = new Button(this.maxWidth-100, 0, 100, 50, "Back", this.backToMenu.bind(this))
    this.backButton.displayGroup = this.uiLayer
    this.pixiApp.stage.addChild(this.backButton)

    this.loadingNewLevel = false
    this.timerNowTime = window.performance.now()
    this.timerStartTime = this.timerNowTime
    this.toggleUIVisibility(true)
  }

  removePuzzle() {
    this.loadingNewLevel = true
    
    if (this.guide) {
      // Pause and reset current video
      this.guide.texture.baseTexture.source.pause()
      this.guide.texture.baseTexture.source.currentTime = 0

      // remove guide
      this.unregisterInstance(this.guide)
      this.destroyInstance(this.guide)
    }

    // remove pieces
    if (this.pieces) {
      this.pieces.forEach( (piece) => {
        this.unregisterInstance(piece)
        this.destroyInstance(piece)
      })

      this.pieces = []
    }

    // remove back button
    if (this.backButton) {
      this.unregisterInstance(this.backButton)
      this.destroyInstance(this.backButton)
    }
  }

  toggleUIVisibility(on) {
    this.frame.visible = on
    this.titleText.visible = on
    this.timerText.visible = on
  }

  backToMenu() {
    this.removePuzzle()
    this.toggleUIVisibility()
    this.menuScreen.activate()
  }

  process() {
    this.background.tilePosition.x -= 0.1
    this.background.tilePosition.y -= 0.1

    let done = true

    this.pieces.forEach( (piece) => {
      done = piece.done && done
    })

    if (!this.loadingNewLevel) {
      if (done && !this.puzzleComplete) {
        this.titleText.text = "Complete!"
        this.puzzleComplete = true
        //this.guide.filters = []
        this.guide.tint = 0xFFFFFF
        this.pieces.forEach(function(piece) {
          piece.visible = false
        })
      } else {
        this.timerNowTime = window.performance.now()
        let duration = this.timerNowTime - this.timerStartTime
        let min = Math.floor(duration/1000/60)
        let sec = ((duration/1000) % 60).toFixed(1)

        if (sec < 10) {
          this.timerText.text = `${min}:0${sec}`
        } else {
          this.timerText.text = `${min}:${sec}`
        }
      }
    }
  }
}