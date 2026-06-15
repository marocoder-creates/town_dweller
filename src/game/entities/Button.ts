import { Scene, GameObjects } from 'phaser';

export class Button extends GameObjects.Container
{
    private background: GameObjects.Graphics;
    private buttonText: GameObjects.Text;
    private isHovered: boolean = false;
    private isPressed: boolean = false;

    private widthVal: number;
    private heightVal: number;
    private callback?: () => void;

    // Design Tokens (Modern Indigo/Violet/Slate Color Palette)
    private colors = {
        bgNormal: 0x1e1b4b,       // Very dark indigo
        bgHover: 0x312e81,        // Dark indigo
        bgPressed: 0x111827,      // Off-black / dark slate
        borderNormal: 0x4f46e5,   // Indigo-600
        borderHover: 0x818cf8,    // Indigo-400 (glowy)
        borderPressed: 0x3730a3,  // Indigo-800
        textNormal: '#e0e7ff',    // Light indigo/white
        textHover: '#ffffff',     // White
        textPressed: '#93c5fd'    // Light blue
    };

    constructor (scene: Scene, x: number, y: number, label: string, callback?: () => void, width?: number, height?: number)
    {
        const w = width !== undefined ? width : 200;
        const h = height !== undefined ? height : 60; // Sleeker 60px height instead of 80px
        
        super(scene, x, y);
        this.widthVal = w;
        this.heightVal = h;
        this.callback = callback;
        this.scene = scene;
        scene.add.existing(this);
        this.setSize(w, h);

        // 1. Create Background Graphics
        this.background = scene.add.graphics();
        this.add(this.background);

        // 2. Create Text
        this.buttonText = scene.add.text(0, 0, label, {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: this.colors.textNormal
        });
        this.buttonText.setOrigin(0.5);
        this.add(this.buttonText);

        // Draw the initial button state
        this.drawButton();

        // 3. Make interactive & handle state transitions
        this.setInteractive({ useHandCursor: true })
            .on('pointerover', this.onPointerOver, this)
            .on('pointerout', this.onPointerOut, this)
            .on('pointerdown', this.onPointerDown, this)
            .on('pointerup', this.onPointerUp, this);
    }

    private drawButton()
    {
        this.background.clear();

        let bgCol = this.colors.bgNormal;
        let borderCol = this.colors.borderNormal;
        let thickness = 2;
        let bgAlpha = 0.9;

        if (this.isPressed)
        {
            bgCol = this.colors.bgPressed;
            borderCol = this.colors.borderPressed;
            thickness = 2;
            bgAlpha = 0.95;
        }
        else if (this.isHovered)
        {
            bgCol = this.colors.bgHover;
            borderCol = this.colors.borderHover;
            thickness = 3;
            bgAlpha = 0.95;
        }

        // Draw button fill with rounded corners
        this.background.fillStyle(bgCol, bgAlpha);
        this.background.fillRoundedRect(-this.widthVal / 2, -this.heightVal / 2, this.widthVal, this.heightVal, 10);

        // Draw button stroke/outline
        this.background.lineStyle(thickness, borderCol, 1.0);
        this.background.strokeRoundedRect(-this.widthVal / 2, -this.heightVal / 2, this.widthVal, this.heightVal, 10);
    }

    private onPointerOver()
    {
        this.isHovered = true;
        this.buttonText.setColor(this.colors.textHover);
        this.drawButton();

        // Scale up smoothly on hover
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 120,
            ease: 'Back.easeOut',
            overwrite: true
        });
    }

    private onPointerOut()
    {
        this.isHovered = false;
        this.isPressed = false;
        this.buttonText.setColor(this.colors.textNormal);
        this.drawButton();

        // Scale down smoothly back to default
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 120,
            ease: 'Quad.easeOut',
            overwrite: true
        });
    }

    private onPointerDown()
    {
        this.isPressed = true;
        this.buttonText.setColor(this.colors.textPressed);
        this.drawButton();

        // Depress effect on click
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 80,
            ease: 'Quad.easeOut',
            overwrite: true
        });
    }

    private onPointerUp()
    {
        if (this.isPressed)
        {
            this.isPressed = false;
            this.buttonText.setColor(this.isHovered ? this.colors.textHover : this.colors.textNormal);
            this.drawButton();

            if (this.callback)
            {
                this.callback();
            }
            if (!this.scene || !this.scene.tweens) return;
            // Animate scale back up
            this.scene.tweens.add({
                targets: this,
                scaleX: this.isHovered ? 1.05 : 1.0,
                scaleY: this.isHovered ? 1.05 : 1.0,
                duration: 120,
                ease: 'Back.easeOut',
                overwrite: true
            });
        }
    }

    public setLabel(label: string)
    {
        this.buttonText.setText(label);
    }
}
