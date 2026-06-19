import { Scene, GameObjects, Math as PhaserMath } from 'phaser';

type WorkVariant = 'blacksmith' | 'farm' | 'mine';

interface ParticleData {
    obj: GameObjects.Arc;
    baseX: number;
    baseY: number;
    speed: number;
    driftX: number;
}

export class WorkBackground extends GameObjects.Container
{
    private sceneryGfx: GameObjects.Graphics;
    private particles: ParticleData[] = [];
    private animatedObjects: GameObjects.GameObject[] = [];
    private particleTimer: Phaser.Time.TimerEvent | null = null;
    private variant: WorkVariant = 'blacksmith';

    constructor(scene: Scene)
    {
        super(scene, 0, 0);
        scene.add.existing(this);
    }

    public randomize(): void
    {
        this.cleanup();

        const variants: WorkVariant[] = ['blacksmith', 'farm', 'mine'];
        this.variant = variants[PhaserMath.Between(0, 2)];

        this.sceneryGfx = this.scene.add.graphics();
        this.add(this.sceneryGfx);

        switch (this.variant)
        {
            case 'blacksmith': this.drawBlacksmith(); break;
            case 'farm': this.drawFarm(); break;
            case 'mine': this.drawMine(); break;
        }

        this.startAnimations();
    }

    private cleanup(): void
    {
        this.particleTimer?.remove();
        this.particleTimer = null;

        this.particles.forEach(p => p.obj.destroy());
        this.particles = [];

        this.animatedObjects.forEach(o => {
            this.scene.tweens.killTweensOf(o);
            o.destroy();
        });
        this.animatedObjects = [];

        if (this.sceneryGfx)
        {
            this.sceneryGfx.destroy();
        }

        this.removeAll();
    }

    // ── BLACKSMITH ──────────────────────────────────────────

    private drawBlacksmith(): void
    {
        const gfx = this.sceneryGfx;

        // Dark interior walls
        gfx.fillStyle(0x1e293b, 1.0);
        gfx.fillRect(0, 50, 1024, 528);

        // Back wall (slightly lighter)
        gfx.fillStyle(0x334155, 1.0);
        gfx.fillRect(50, 50, 924, 400);

        // Wall stone texture lines
        gfx.lineStyle(1, 0x475569, 0.3);
        for (let y = 80; y < 440; y += 50)
        {
            gfx.beginPath();
            gfx.moveTo(50, y);
            gfx.lineTo(974, y);
            gfx.strokePath();
        }
        for (let x = 150; x < 974; x += 120)
        {
            gfx.beginPath();
            gfx.moveTo(x, 50);
            gfx.lineTo(x, 450);
            gfx.strokePath();
        }

        // Floor
        gfx.fillStyle(0x0f172a, 1.0);
        gfx.fillRect(0, 450, 1024, 128);

        // Floor planks
        gfx.lineStyle(1, 0x1e293b, 0.5);
        for (let y = 470; y < 578; y += 25)
        {
            gfx.beginPath();
            gfx.moveTo(0, y);
            gfx.lineTo(1024, y);
            gfx.strokePath();
        }

        // ── Furnace (right side) ──
        // Furnace body
        gfx.fillStyle(0x475569, 1.0);
        gfx.fillRoundedRect(720, 280, 200, 170, 8);

        // Furnace opening
        gfx.fillStyle(0x0f172a, 1.0);
        gfx.beginPath();
        gfx.arc(820, 400, 50, Math.PI, 0, false);
        gfx.closePath();
        gfx.fillPath();

        // Fire glow inside furnace
        gfx.fillStyle(0xf97316, 0.8);
        gfx.beginPath();
        gfx.arc(820, 400, 40, Math.PI, 0, false);
        gfx.closePath();
        gfx.fillPath();

        // Inner fire
        gfx.fillStyle(0xfbbf24, 0.9);
        gfx.beginPath();
        gfx.arc(820, 400, 25, Math.PI, 0, false);
        gfx.closePath();
        gfx.fillPath();

        // Fire core
        gfx.fillStyle(0xfef3c7, 0.7);
        gfx.beginPath();
        gfx.arc(820, 400, 12, Math.PI, 0, false);
        gfx.closePath();
        gfx.fillPath();

        // Chimney pipe
        gfx.fillStyle(0x475569, 1.0);
        gfx.fillRect(800, 50, 40, 230);

        // Furnace glow on wall
        gfx.fillStyle(0xf97316, 0.08);
        gfx.fillCircle(820, 350, 180);

        // ── Anvil (center) ──
        // Anvil base
        gfx.fillStyle(0x64748b, 1.0);
        gfx.fillRect(440, 420, 80, 30);

        // Anvil body
        gfx.fillStyle(0x94a3b8, 1.0);
        gfx.fillRect(430, 400, 100, 20);

        // Anvil top (flat working surface)
        gfx.fillStyle(0xcbd5e1, 1.0);
        gfx.fillRect(420, 390, 120, 12);

        // Anvil horn (left)
        gfx.fillStyle(0x94a3b8, 1.0);
        gfx.fillTriangle(420, 390, 390, 395, 420, 402);

        // Anvil highlight
        gfx.fillStyle(0xe2e8f0, 0.4);
        gfx.fillRect(425, 391, 110, 4);

        // ── Tool rack (left wall) ──
        // Rack board
        gfx.fillStyle(0x475569, 0.8);
        gfx.fillRect(100, 200, 10, 200);

        // Hanging tools (hammer shapes)
        this.drawHammer(gfx, 105, 230);
        this.drawHammer(gfx, 105, 290);
        this.drawTongs(gfx, 105, 350);

        // Bucket of water (near anvil)
        gfx.fillStyle(0x475569, 0.9);
        gfx.fillRect(340, 430, 40, 25);
        gfx.fillStyle(0x38bdf8, 0.5);
        gfx.fillRect(343, 432, 34, 15);

        // Furnace ember glow (pulsating rectangle)
        const emberGlow = this.scene.add.rectangle(820, 390, 90, 30, 0xf97316, 0.3);
        this.add(emberGlow);
        this.animatedObjects.push(emberGlow);

        this.scene.tweens.add({
            targets: emberGlow,
            alpha: { from: 0.15, to: 0.4 },
            scaleX: { from: 0.9, to: 1.1 },
            scaleY: { from: 0.9, to: 1.1 },
            duration: PhaserMath.Between(600, 1000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Sparks
        this.createSparks(820, 340, 20);
    }

    private drawHammer(gfx: GameObjects.Graphics, x: number, y: number): void
    {
        // Handle
        gfx.fillStyle(0x78716c, 0.9);
        gfx.fillRect(x, y, 35, 4);
        // Head
        gfx.fillStyle(0x94a3b8, 1.0);
        gfx.fillRect(x + 30, y - 6, 12, 16);
    }

    private drawTongs(gfx: GameObjects.Graphics, x: number, y: number): void
    {
        gfx.lineStyle(3, 0x78716c, 0.9);
        gfx.beginPath();
        gfx.moveTo(x, y);
        gfx.lineTo(x + 30, y + 8);
        gfx.moveTo(x, y + 4);
        gfx.lineTo(x + 30, y - 4);
        gfx.strokePath();
    }

    private createSparks(originX: number, originY: number, count: number): void
    {
        for (let i = 0; i < count; i++)
        {
            const spark = this.scene.add.circle(originX, originY, PhaserMath.FloatBetween(1, 2.5), 0xfbbf24, 0);
            this.add(spark);
            this.particles.push({
                obj: spark,
                baseX: originX,
                baseY: originY,
                speed: PhaserMath.FloatBetween(40, 100),
                driftX: PhaserMath.FloatBetween(-40, 40)
            });
        }
    }

    // ── FARM ────────────────────────────────────────────────

    private drawFarm(): void
    {
        const gfx = this.sceneryGfx;

        // Sky
        gfx.fillGradientStyle(0xdbeafe, 0xdbeafe, 0xbfdbfe, 0xbfdbfe);
        gfx.fillRect(0, 50, 1024, 528);

        // Clouds
        this.drawCloud(gfx, 150, 100, 1.0);
        this.drawCloud(gfx, 500, 80, 0.7);
        this.drawCloud(gfx, 800, 110, 0.85);

        // Distant hills
        gfx.fillStyle(0x94a3b8, 0.4);
        gfx.fillTriangle(0, 300, 200, 200, 400, 300);
        gfx.fillStyle(0x64748b, 0.3);
        gfx.fillTriangle(300, 300, 550, 180, 800, 300);
        gfx.fillStyle(0x94a3b8, 0.35);
        gfx.fillTriangle(650, 300, 850, 210, 1024, 300);

        // Snow on hills
        gfx.fillStyle(0xf0f9ff, 0.5);
        gfx.fillTriangle(160, 225, 200, 200, 240, 225);
        gfx.fillTriangle(510, 210, 550, 180, 590, 210);
        gfx.fillTriangle(810, 235, 850, 210, 890, 235);

        // Ground (snowy field)
        gfx.fillStyle(0xf0f9ff, 1.0);
        gfx.fillRect(0, 300, 1024, 278);

        // Ground texture
        gfx.fillStyle(0xe0f2fe, 0.5);
        gfx.fillRect(0, 380, 1024, 198);

        // ── Barn (right background) ──
        // Barn body
        gfx.fillStyle(0x475569, 1.0);
        gfx.fillRect(750, 240, 160, 120);

        // Barn roof
        gfx.fillStyle(0x334155, 1.0);
        gfx.fillTriangle(740, 240, 830, 190, 920, 240);

        // Snow on roof
        gfx.fillStyle(0xf0f9ff, 0.7);
        gfx.fillTriangle(770, 225, 830, 195, 890, 225);

        // Barn door
        gfx.fillStyle(0x1e293b, 0.9);
        gfx.fillRect(800, 300, 40, 60);

        // Barn door arch
        gfx.fillStyle(0x1e293b, 0.9);
        gfx.beginPath();
        gfx.arc(820, 300, 20, Math.PI, 0, false);
        gfx.closePath();
        gfx.fillPath();

        // Barn window
        gfx.fillStyle(0xfbbf24, 0.6);
        gfx.fillRect(770, 270, 15, 15);

        // ── Fence ──
        gfx.fillStyle(0x64748b, 0.8);
        // Posts
        for (let x = 100; x <= 700; x += 80)
        {
            gfx.fillRect(x, 340, 6, 40);
        }
        // Rails
        gfx.fillRect(100, 348, 606, 4);
        gfx.fillRect(100, 365, 606, 4);

        // Snow on fence rails
        gfx.fillStyle(0xf0f9ff, 0.6);
        gfx.fillRect(100, 345, 606, 3);
        gfx.fillRect(100, 362, 606, 3);

        // ── Crop rows (foreground) ──
        this.drawCropRows(gfx);

        // Swaying crops (animated)
        this.createSwayingCrops();
    }

    private drawCloud(gfx: GameObjects.Graphics, x: number, y: number, scale: number): void
    {
        gfx.fillStyle(0xffffff, 0.5);
        const r = 20 * scale;
        gfx.fillCircle(x, y, r);
        gfx.fillCircle(x + r * 1.2, y - r * 0.3, r * 0.8);
        gfx.fillCircle(x + r * 2, y, r * 0.9);
        gfx.fillCircle(x - r * 0.8, y + r * 0.2, r * 0.6);
        gfx.fillCircle(x + r * 2.5, y + r * 0.2, r * 0.5);
    }

    private drawCropRows(gfx: GameObjects.Graphics): void
    {
        gfx.fillStyle(0x64748b, 0.4);

        // Dirt rows under crops
        for (let row = 0; row < 4; row++)
        {
            const y = 420 + row * 35;
            gfx.fillStyle(0x94a3b8, 0.2);
            gfx.fillRect(80, y + 15, 550, 8);
        }
    }

    private createSwayingCrops(): void
    {
        for (let row = 0; row < 4; row++)
        {
            const y = 420 + row * 35;
            for (let col = 0; col < 12; col++)
            {
                const x = 100 + col * 48;
                const cropGfx = this.scene.add.graphics();

                // Stem
                cropGfx.lineStyle(2, 0x64748b, 0.7);
                cropGfx.beginPath();
                cropGfx.moveTo(0, 18);
                cropGfx.lineTo(0, 0);
                cropGfx.strokePath();

                // Crop top (small circle)
                cropGfx.fillStyle(0x94a3b8, 0.6);
                cropGfx.fillCircle(0, -2, 4);

                // Snow on top
                cropGfx.fillStyle(0xf0f9ff, 0.5);
                cropGfx.fillCircle(0, -4, 3);

                cropGfx.setPosition(x, y);
                this.add(cropGfx);
                this.animatedObjects.push(cropGfx);

                this.scene.tweens.add({
                    targets: cropGfx,
                    angle: { from: -3, to: 3 },
                    duration: PhaserMath.Between(1500, 2500),
                    delay: PhaserMath.Between(0, 1000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }
    }

    // ── MINE ────────────────────────────────────────────────

    private drawMine(): void
    {
        const gfx = this.sceneryGfx;

        // Deep underground dark fill
        gfx.fillStyle(0x0f172a, 1.0);
        gfx.fillRect(0, 50, 1024, 528);

        // Tunnel shape — receding perspective
        // Outer tunnel frame (dark rock)
        gfx.fillStyle(0x334155, 1.0);
        // Ceiling
        gfx.beginPath();
        gfx.moveTo(0, 50);
        gfx.lineTo(1024, 50);
        gfx.lineTo(800, 120);
        gfx.lineTo(220, 120);
        gfx.closePath();
        gfx.fillPath();

        // Left wall
        gfx.beginPath();
        gfx.moveTo(0, 50);
        gfx.lineTo(220, 120);
        gfx.lineTo(220, 480);
        gfx.lineTo(0, 578);
        gfx.closePath();
        gfx.fillPath();

        // Right wall
        gfx.beginPath();
        gfx.moveTo(1024, 50);
        gfx.lineTo(800, 120);
        gfx.lineTo(800, 480);
        gfx.lineTo(1024, 578);
        gfx.closePath();
        gfx.fillPath();

        // Floor
        gfx.beginPath();
        gfx.moveTo(0, 578);
        gfx.lineTo(220, 480);
        gfx.lineTo(800, 480);
        gfx.lineTo(1024, 578);
        gfx.closePath();
        gfx.fillPath();

        // Inner tunnel (deeper darkness receding)
        gfx.fillStyle(0x1e293b, 1.0);
        gfx.fillRect(220, 120, 580, 360);

        // Deeper tunnel opening
        gfx.fillStyle(0x0f172a, 0.8);
        gfx.fillRect(320, 180, 380, 250);

        // Deepest blackness
        gfx.fillStyle(0x020617, 0.9);
        gfx.fillRect(400, 220, 220, 180);

        // Wall texture — horizontal rock lines
        gfx.lineStyle(1, 0x475569, 0.3);
        for (let y = 150; y < 470; y += 40)
        {
            gfx.beginPath();
            gfx.moveTo(220, y);
            gfx.lineTo(800, y);
            gfx.strokePath();
        }

        // Support beams (wooden)
        gfx.fillStyle(0x78716c, 0.8);
        // Left beam
        gfx.fillRect(250, 120, 12, 360);
        // Right beam
        gfx.fillRect(758, 120, 12, 360);
        // Top beam
        gfx.fillRect(250, 120, 520, 10);

        // Second set of beams (deeper)
        gfx.fillStyle(0x78716c, 0.5);
        gfx.fillRect(350, 175, 8, 305);
        gfx.fillRect(662, 175, 8, 305);
        gfx.fillRect(350, 175, 320, 7);

        // ── Ore veins on walls ──
        this.drawOreVein(gfx, 240, 250, 30, 20);
        this.drawOreVein(gfx, 235, 350, 25, 18);
        this.drawOreVein(gfx, 770, 280, 28, 22);
        this.drawOreVein(gfx, 775, 390, 22, 16);

        // Glowing ore spots (animated)
        this.createGlowingOres();

        // ── Rails on floor ──
        gfx.lineStyle(3, 0x64748b, 0.7);
        // Left rail
        gfx.beginPath();
        gfx.moveTo(350, 578);
        gfx.lineTo(420, 480);
        gfx.lineTo(420, 400);
        gfx.strokePath();
        // Right rail
        gfx.beginPath();
        gfx.moveTo(550, 578);
        gfx.lineTo(500, 480);
        gfx.lineTo(500, 400);
        gfx.strokePath();

        // Cross ties
        gfx.lineStyle(2, 0x78716c, 0.5);
        for (let i = 0; i < 6; i++)
        {
            const t = i / 5;
            const lx = 350 + (420 - 350) * t;
            const rx = 550 + (500 - 550) * t;
            const y = 578 + (440 - 578) * t;
            gfx.beginPath();
            gfx.moveTo(lx - 10, y);
            gfx.lineTo(rx + 10, y);
            gfx.strokePath();
        }

        // ── Mine cart ──
        // Cart body
        gfx.fillStyle(0x64748b, 1.0);
        gfx.beginPath();
        gfx.moveTo(380, 530);
        gfx.lineTo(400, 490);
        gfx.lineTo(520, 490);
        gfx.lineTo(540, 530);
        gfx.closePath();
        gfx.fillPath();

        // Cart border
        gfx.lineStyle(2, 0x94a3b8, 0.8);
        gfx.beginPath();
        gfx.moveTo(380, 530);
        gfx.lineTo(400, 490);
        gfx.lineTo(520, 490);
        gfx.lineTo(540, 530);
        gfx.strokePath();

        // Ore in cart
        gfx.fillStyle(0x475569, 0.9);
        gfx.fillCircle(435, 495, 12);
        gfx.fillCircle(465, 492, 14);
        gfx.fillCircle(495, 496, 11);

        // Ore highlights in cart
        gfx.fillStyle(0x38bdf8, 0.4);
        gfx.fillCircle(435, 492, 4);
        gfx.fillCircle(468, 489, 5);
        gfx.fillCircle(493, 493, 3);

        // Wheels
        gfx.fillStyle(0x94a3b8, 1.0);
        gfx.fillCircle(405, 535, 10);
        gfx.fillCircle(515, 535, 10);
        gfx.fillStyle(0x64748b, 1.0);
        gfx.fillCircle(405, 535, 5);
        gfx.fillCircle(515, 535, 5);

        // Dripping water
        this.createWaterDrips();
    }

    private drawOreVein(gfx: GameObjects.Graphics, x: number, y: number, w: number, h: number): void
    {
        // Rock cluster base
        gfx.fillStyle(0x475569, 0.8);
        gfx.beginPath();
        gfx.moveTo(x, y + h / 2);
        gfx.lineTo(x + w * 0.3, y);
        gfx.lineTo(x + w * 0.7, y + h * 0.2);
        gfx.lineTo(x + w, y + h / 2);
        gfx.lineTo(x + w * 0.6, y + h);
        gfx.lineTo(x + w * 0.2, y + h * 0.8);
        gfx.closePath();
        gfx.fillPath();

        // Ore sparkle spots
        gfx.fillStyle(0x38bdf8, 0.5);
        gfx.fillCircle(x + w * 0.4, y + h * 0.4, 3);
        gfx.fillCircle(x + w * 0.6, y + h * 0.6, 2);
        gfx.fillCircle(x + w * 0.3, y + h * 0.7, 2.5);
    }

    private createGlowingOres(): void
    {
        const orePositions = [
            { x: 252, y: 258 }, { x: 248, y: 358 },
            { x: 782, y: 290 }, { x: 786, y: 398 }
        ];

        for (const pos of orePositions)
        {
            const glow = this.scene.add.circle(pos.x, pos.y, 12, 0x38bdf8, 0.15);
            this.add(glow);
            this.animatedObjects.push(glow);

            this.scene.tweens.add({
                targets: glow,
                alpha: { from: 0.08, to: 0.25 },
                scaleX: { from: 0.8, to: 1.3 },
                scaleY: { from: 0.8, to: 1.3 },
                duration: PhaserMath.Between(1500, 2500),
                delay: PhaserMath.Between(0, 1000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private createWaterDrips(): void
    {
        const dripPositions = [
            { x: 300, startY: 130 },
            { x: 550, startY: 125 },
            { x: 720, startY: 135 }
        ];

        for (const drip of dripPositions)
        {
            const drop = this.scene.add.circle(drip.x, drip.startY, 2, 0x38bdf8, 0);
            this.add(drop);
            this.particles.push({
                obj: drop,
                baseX: drip.x,
                baseY: drip.startY,
                speed: PhaserMath.FloatBetween(50, 80),
                driftX: 0
            });
        }
    }

    // ── ANIMATIONS ──────────────────────────────────────────

    private startAnimations(): void
    {
        this.particleTimer = this.scene.time.addEvent({
            delay: 16,
            callback: this.updateParticles,
            callbackScope: this,
            loop: true
        });
    }

    private updateParticles(): void
    {
        const dt = 16 / 1000;

        if (this.variant === 'blacksmith')
        {
            for (const spark of this.particles)
            {
                if (spark.obj.alpha <= 0)
                {
                    // Respawn with random delay
                    if (Math.random() < 0.02)
                    {
                        spark.obj.setPosition(
                            spark.baseX + PhaserMath.Between(-10, 10),
                            spark.baseY
                        );
                        spark.obj.setAlpha(PhaserMath.FloatBetween(0.5, 1.0));
                        spark.driftX = PhaserMath.FloatBetween(-40, 40);
                        spark.speed = PhaserMath.FloatBetween(40, 100);
                    }
                }
                else
                {
                    spark.obj.y -= spark.speed * dt;
                    spark.obj.x += spark.driftX * dt;
                    spark.obj.alpha -= dt * 0.8;
                    if (spark.obj.alpha < 0) spark.obj.alpha = 0;
                }
            }
        }
        else if (this.variant === 'mine')
        {
            for (const drip of this.particles)
            {
                if (drip.obj.alpha <= 0)
                {
                    if (Math.random() < 0.008)
                    {
                        drip.obj.setPosition(drip.baseX, drip.baseY);
                        drip.obj.setAlpha(0.6);
                    }
                }
                else
                {
                    drip.obj.y += drip.speed * dt;
                    drip.obj.alpha -= dt * 0.15;

                    if (drip.obj.y > 480)
                    {
                        drip.obj.alpha = 0;

                        // Splash ring
                        const splash = this.scene.add.circle(drip.obj.x, 480, 3, 0x38bdf8, 0.4);
                        this.add(splash);
                        this.scene.tweens.add({
                            targets: splash,
                            scaleX: 2.5,
                            scaleY: 0.5,
                            alpha: 0,
                            duration: 400,
                            ease: 'Quad.easeOut',
                            onComplete: () => splash.destroy()
                        });
                    }
                }
            }
        }
    }

    // ── PUBLIC API ───────────────────────────────────────────

    public show(): void
    {
        this.setVisible(true);

        if (!this.particleTimer || this.particleTimer.hasDispatched)
        {
            this.particleTimer = this.scene.time.addEvent({
                delay: 16,
                callback: this.updateParticles,
                callbackScope: this,
                loop: true
            });
        }

        // Restart animated object tweens
        for (const obj of this.animatedObjects)
        {
            const tweens = this.scene.tweens.getTweensOf(obj);
            if (tweens.length === 0)
            {
                if (obj instanceof GameObjects.Rectangle)
                {
                    this.scene.tweens.add({
                        targets: obj,
                        alpha: { from: 0.15, to: 0.4 },
                        scaleX: { from: 0.9, to: 1.1 },
                        scaleY: { from: 0.9, to: 1.1 },
                        duration: PhaserMath.Between(600, 1000),
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
                else if (obj instanceof GameObjects.Arc)
                {
                    this.scene.tweens.add({
                        targets: obj,
                        alpha: { from: 0.08, to: 0.25 },
                        scaleX: { from: 0.8, to: 1.3 },
                        scaleY: { from: 0.8, to: 1.3 },
                        duration: PhaserMath.Between(1500, 2500),
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
                else if (obj instanceof GameObjects.Graphics)
                {
                    this.scene.tweens.add({
                        targets: obj,
                        angle: { from: -3, to: 3 },
                        duration: PhaserMath.Between(1500, 2500),
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
        }
    }

    public hide(): void
    {
        this.setVisible(false);

        this.particleTimer?.remove();
        this.particleTimer = null;

        this.animatedObjects.forEach(o => this.scene.tweens.killTweensOf(o));
        this.particles.forEach(p => this.scene.tweens.killTweensOf(p.obj));
    }

    destroy(fromScene?: boolean): void
    {
        this.particleTimer?.remove();
        this.particleTimer = null;
        super.destroy(fromScene);
    }
}
