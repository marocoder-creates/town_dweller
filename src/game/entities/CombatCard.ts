import { Scene, Geom, GameObjects } from 'phaser';

export class CombatCard extends GameObjects.Container
{
    private background: GameObjects.Graphics;
    private nameText: GameObjects.Text;
    private hpText: GameObjects.Text;
    private levelText: GameObjects.Text;

    private widthVal: number;
    private heightVal: number;
    
    private isPlayer: boolean;
    private isHovered: boolean = false;

    // HP tracking properties for Tweens
    private maxHp: number;
    private currentHpPercent: number = 1.0;
    private delayHpPercent: number = 1.0;

    // ATB tracking properties
    private atbPercent: number = 0;
    public atbProgress: number = 0;
    public speedMs: number = 3000;

    // Theme tokens
    private colors = {
        bg: 0x0f172a,            // Slate-900
        borderNormal: 0x4f46e5,   // Indigo-600 (default)
        borderHover: 0x818cf8,    // Indigo-400 (glow)
        barBg: 0x334155,         // Slate-700
        barMain: 0x10b981,       // Emerald-500 (Healed/Healthy)
        barDelay: 0xfca5a5,      // Rose-300 (Loss preview)
        textNormal: '#f8fafc',   // Slate-50
        textMuted: '#94a3b8'     // Slate-400
    };

    constructor (scene: Scene, x: number, y: number, name: string, hp: number, maxHp: number, level: number, dex: number, isPlayer: boolean)
    {
        const w = 280;
        const h = 95;

        super(scene, x, y);
        this.widthVal = w;
        this.heightVal = h;
        this.isPlayer = isPlayer;
        this.maxHp = maxHp;
        this.currentHpPercent = hp / maxHp;
        this.delayHpPercent = hp / maxHp;
        this.speedMs = 30000 / (dex + 5);

        // Customize colors based on type
        if (!isPlayer)
        {
            this.colors.borderNormal = 0xf43f5e; // Rose-500 (Hostile)
            this.colors.borderHover = 0xfda4af;  // Rose-300
            this.colors.barMain = 0xef4444;      // Red-500 (Enemy HP)
            this.colors.barDelay = 0xfde047;     // Yellow-300 (Loss preview)
        }

        scene.add.existing(this);
        this.setSize(w, h);

        // 1. Create Graphics GameObject for background + health bars
        this.background = scene.add.graphics();
        this.add(this.background);

        // 2. Create Name text
        this.nameText = scene.add.text(-w / 2 + 15, -h / 2 + 18, name, {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: this.colors.textNormal
        });
        this.nameText.setOrigin(0, 0.5);
        this.add(this.nameText);

        // 3. Create Level text
        this.levelText = scene.add.text(w / 2 - 15, -h / 2 + 18, `Lvl ${level}`, {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: this.colors.textMuted
        });
        this.levelText.setOrigin(1, 0.5);
        this.add(this.levelText);

        // 4. Create HP overlay text (centered on the health bar)
        this.hpText = scene.add.text(0, 2, `HP: ${hp}/${maxHp}`, {
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.hpText.setOrigin(0.5, 0.5);
        this.add(this.hpText);

        // Draw card panel & bars
        this.drawCard();

        // 5. Add interactive hover state for enemies
        if (!isPlayer)
        {
            this.setInteractive(new Geom.Rectangle(-w / 2, -h / 2, w, h), Geom.Rectangle.Contains);
            this.on('pointerover', this.onPointerOver, this);
            this.on('pointerout', this.onPointerOut, this);
        }
    }

    private drawCard()
    {
        this.background.clear();

        // Draw card background (Glassmorphic look: semi-translucent)
        this.background.fillStyle(this.colors.bg, 0.85);
        this.background.fillRoundedRect(-this.widthVal / 2, -this.heightVal / 2, this.widthVal, this.heightVal, 12);

        // Draw border outline
        const borderCol = this.isHovered ? this.colors.borderHover : this.colors.borderNormal;
        const borderThickness = this.isHovered ? 3 : 2;
        this.background.lineStyle(borderThickness, borderCol, 1.0);
        this.background.strokeRoundedRect(-this.widthVal / 2, -this.heightVal / 2, this.widthVal, this.heightVal, 12);

        // Draw health bar track (background)
        const barX = -this.widthVal / 2 + 15;
        const barY = -6;
        const barW = this.widthVal - 30;
        const barH = 16;
        const radius = 6;

        this.background.fillStyle(this.colors.barBg, 1.0);
        this.background.fillRoundedRect(barX, barY, barW, barH, radius);

        // Draw HP Delay Bar (Red/Yellow catch-up bar)
        if (this.delayHpPercent > 0)
        {
            const delayW = barW * this.delayHpPercent;
            this.background.fillStyle(this.colors.barDelay, 1.0);
            this.background.fillRoundedRect(barX, barY, Math.max(delayW, radius * 2), barH, radius);
        }

        // Draw HP Main Bar (Emerald/Red current bar)
        if (this.currentHpPercent > 0)
        {
            const mainW = barW * this.currentHpPercent;
            this.background.fillStyle(this.colors.barMain, 1.0);
            this.background.fillRoundedRect(barX, barY, Math.max(mainW, radius * 2), barH, radius);
        }

        // Draw health bar outline
        this.background.lineStyle(1.5, 0x0f172a, 1.0);
        this.background.strokeRoundedRect(barX, barY, barW, barH, radius);

        // Draw ATB bar track (background)
        const atbX = -this.widthVal / 2 + 15;
        const atbY = 22;
        const atbW = this.widthVal - 30;
        const atbH = 10;
        const atbRadius = 4;

        this.background.fillStyle(this.colors.barBg, 1.0);
        this.background.fillRoundedRect(atbX, atbY, atbW, atbH, atbRadius);

        // Draw ATB progress fill
        if (this.atbPercent > 0)
        {
            const fillW = atbW * this.atbPercent;
            this.background.fillStyle(0xf59e0b, 1.0); // Amber-500
            this.background.fillRoundedRect(atbX, atbY, Math.max(fillW, atbRadius * 2), atbH, atbRadius);
        }

        // Draw ATB bar outline
        this.background.lineStyle(1.5, 0x0f172a, 1.0);
        this.background.strokeRoundedRect(atbX, atbY, atbW, atbH, atbRadius);
    }

    private onPointerOver()
    {
        this.isHovered = true;
        this.drawCard();

        this.scene.tweens.add({
            targets: this,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 150,
            ease: 'Back.easeOut',
            overwrite: true
        });
    }

    private onPointerOut()
    {
        this.isHovered = false;
        this.drawCard();

        this.scene.tweens.add({
            targets: this,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 150,
            ease: 'Quad.easeOut',
            overwrite: true
        });
    }

    // --- Tweens and Animations ---

    public slideIn(fromX: number, fromY: number, delay: number = 0)
    {
        const targetX = this.x;
        const targetY = this.y;
        this.setPosition(fromX, fromY);
        this.alpha = 0;

        this.scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            alpha: 1,
            duration: 600,
            delay: delay,
            ease: 'Back.easeOut',
            easeParams: [0.8]
        });
    }

    public dash(direction: 'left' | 'right', amount: number = 30)
    {
        const originalX = this.x;
        const offset = direction === 'left' ? -amount : amount;

        // Forward dash step
        this.scene.tweens.add({
            targets: this,
            x: originalX + offset,
            duration: 100,
            ease: 'Quad.easeOut',
            yoyo: true,
            repeat: 0,
            onComplete: () => {
                // Snap back smoothly
                this.scene.tweens.add({
                    targets: this,
                    x: originalX,
                    duration: 180,
                    ease: 'Back.easeOut'
                });
            }
        });
    }

    public shake(duration: number = 300, intensity: number = 4)
    {
        const originalX = this.x;

        this.scene.tweens.add({
            targets: this,
            x: originalX + intensity,
            duration: 40,
            yoyo: true,
            repeat: Math.floor(duration / 80),
            onComplete: () => {
                this.x = originalX;
            }
        });

        // Temporarily highlight border crimson to represent hit feedback
        this.colors.borderNormal = 0xef4444; // Bright red
        this.drawCard();
        
        this.scene.time.delayedCall(200, () => {
            this.colors.borderNormal = this.isPlayer ? 0x4f46e5 : 0xf43f5e;
            this.drawCard();
        });
    }

    public die(callback?: () => void)
    {
        // Disable interaction
        this.disableInteractive();

        this.scene.tweens.add({
            targets: this,
            y: this.y + 50,
            alpha: 0,
            angle: this.isPlayer ? -15 : 15,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 450,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                if (callback)
                {
                    callback();
                }
                this.destroy();
            }
        });
    }

    public updateHp(newHp: number, animate: boolean = true)
    {
        if (newHp < 0) newHp = 0;
        if (newHp > this.maxHp) newHp = this.maxHp;
        const targetPercent = newHp / this.maxHp;

        this.hpText.setText(`HP: ${newHp}/${this.maxHp}`);

        if (!animate)
        {
            this.currentHpPercent = targetPercent;
            this.delayHpPercent = targetPercent;
            this.drawCard();
            return;
        }

        // Kill any existing HP tweens on this object
        this.scene.tweens.killTweensOf(this);

        // 1. Primary HP Bar drops quickly
        this.scene.tweens.add({
            targets: this,
            currentHpPercent: targetPercent,
            duration: 250,
            ease: 'Quad.easeOut',
            onUpdate: () => this.drawCard()
        });

        // 2. Delay HP Bar catches up slowly
        this.scene.tweens.add({
            targets: this,
            delayHpPercent: targetPercent,
            duration: 600,
            delay: 200,
            ease: 'Quad.easeInOut',
            onUpdate: () => this.drawCard()
        });
    }

    public flashHeal(duration: number = 300)
    {
        const originalBorder = this.colors.borderNormal;
        this.colors.borderNormal = 0x10b981; // Emerald-500 Green
        this.drawCard();

        this.scene.time.delayedCall(duration, () => {
            this.colors.borderNormal = originalBorder;
            this.drawCard();
        });
    }

    public updateMaxHp(newMaxHp: number)
    {
        this.maxHp = newMaxHp;
        this.drawCard();
    }

    public updateLevel(newLevel: number)
    {
        this.levelText.setText(`Lvl ${newLevel}`);
    }

    public updateAtb(percent: number)
    {
        this.atbPercent = percent;
        this.drawCard();
    }
}
