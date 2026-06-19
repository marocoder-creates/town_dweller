import { Scene, GameObjects, Math as PhaserMath } from 'phaser';

interface HutData {
    wallX: number; wallY: number; wallW: number; wallH: number;
    wallColor: number;
    roofLeft: { x: number; y: number };
    roofPeak: { x: number; y: number };
    roofRight: { x: number; y: number };
    windows: { x: number; y: number; w: number; h: number }[];
    chimney: { x: number; y: number; w: number; h: number };
    smokeOrigin: { x: number; y: number };
}

interface SnowflakeData {
    circle: GameObjects.Arc;
    baseX: number;
    speed: number;
    sway: number;
    swaySpeed: number;
}

export class TownBackground extends GameObjects.Container
{
    private sceneryGfx: GameObjects.Graphics;
    private windowRects: GameObjects.Rectangle[] = [];
    private smokePuffs: GameObjects.Arc[] = [];
    private snowflakes: SnowflakeData[] = [];
    private snowTimer: Phaser.Time.TimerEvent | null = null;
    private huts: HutData[];

    constructor(scene: Scene)
    {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.huts = this.defineHuts();
        this.drawStaticScenery();
        this.createWindows();
        this.createSmoke();
        this.createSnow();
        this.startAnimations();
    }

    private defineHuts(): HutData[]
    {
        return [
            {
                wallX: 520, wallY: 390, wallW: 50, wallH: 40,
                wallColor: 0x64748b,
                roofLeft: { x: 515, y: 390 },
                roofPeak: { x: 545, y: 360 },
                roofRight: { x: 575, y: 390 },
                windows: [
                    { x: 530, y: 405, w: 8, h: 8 },
                    { x: 550, y: 405, w: 8, h: 8 }
                ],
                chimney: { x: 560, y: 362, w: 6, h: 18 },
                smokeOrigin: { x: 563, y: 362 }
            },
            {
                wallX: 610, wallY: 380, wallW: 60, wallH: 50,
                wallColor: 0x475569,
                roofLeft: { x: 605, y: 380 },
                roofPeak: { x: 640, y: 340 },
                roofRight: { x: 675, y: 380 },
                windows: [
                    { x: 622, y: 398, w: 10, h: 10 },
                    { x: 648, y: 398, w: 10, h: 10 }
                ],
                chimney: { x: 660, y: 342, w: 7, h: 20 },
                smokeOrigin: { x: 663, y: 342 }
            },
            {
                wallX: 710, wallY: 395, wallW: 40, wallH: 35,
                wallColor: 0x64748b,
                roofLeft: { x: 706, y: 395 },
                roofPeak: { x: 730, y: 370 },
                roofRight: { x: 754, y: 395 },
                windows: [
                    { x: 720, y: 407, w: 7, h: 7 }
                ],
                chimney: { x: 742, y: 372, w: 5, h: 15 },
                smokeOrigin: { x: 744, y: 372 }
            }
        ];
    }

    private drawStaticScenery(): void
    {
        this.sceneryGfx = this.scene.add.graphics();
        this.add(this.sceneryGfx);

        // 1. Sky gradient
        this.sceneryGfx.fillGradientStyle(0xdbeafe, 0xdbeafe, 0xbfdbfe, 0xbfdbfe);
        this.sceneryGfx.fillRect(0, 50, 1024, 528);

        // 2. Mountains (back to front)
        this.sceneryGfx.fillStyle(0x64748b, 0.7);
        this.sceneryGfx.fillTriangle(350, 380, 550, 100, 750, 380);

        this.sceneryGfx.fillStyle(0x94a3b8, 0.8);
        this.sceneryGfx.fillTriangle(150, 400, 380, 160, 610, 400);

        this.sceneryGfx.fillStyle(0x475569, 0.9);
        this.sceneryGfx.fillTriangle(500, 420, 720, 140, 940, 420);

        // Snow caps on mountains
        this.sceneryGfx.fillStyle(0xf0f9ff, 0.9);
        this.sceneryGfx.fillTriangle(520, 180, 550, 100, 580, 180);
        this.sceneryGfx.fillTriangle(350, 230, 380, 160, 410, 230);
        this.sceneryGfx.fillTriangle(690, 220, 720, 140, 750, 220);

        // 3. Cave entrance (dark arch on front-right mountain)
        this.sceneryGfx.fillStyle(0x1e293b, 0.95);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.arc(760, 310, 25, Math.PI, 0, false);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Cave inner shadow
        this.sceneryGfx.fillStyle(0x0f172a, 0.8);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.arc(760, 310, 18, Math.PI, 0, false);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // 4. Snow ground (irregular top edge)
        this.sceneryGfx.fillStyle(0xf0f9ff, 1.0);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(0, 400);
        this.sceneryGfx.lineTo(100, 388);
        this.sceneryGfx.lineTo(250, 395);
        this.sceneryGfx.lineTo(400, 382);
        this.sceneryGfx.lineTo(500, 392);
        this.sceneryGfx.lineTo(600, 385);
        this.sceneryGfx.lineTo(700, 378);
        this.sceneryGfx.lineTo(850, 388);
        this.sceneryGfx.lineTo(1024, 393);
        this.sceneryGfx.lineTo(1024, 578);
        this.sceneryGfx.lineTo(0, 578);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Snow ground highlight layer
        this.sceneryGfx.fillStyle(0xe0f2fe, 0.4);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(0, 420);
        this.sceneryGfx.lineTo(200, 410);
        this.sceneryGfx.lineTo(450, 418);
        this.sceneryGfx.lineTo(700, 405);
        this.sceneryGfx.lineTo(1024, 415);
        this.sceneryGfx.lineTo(1024, 578);
        this.sceneryGfx.lineTo(0, 578);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // 5. Path from village to cave (subtle stroke)
        this.sceneryGfx.lineStyle(3, 0xcbd5e1, 0.25);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(640, 385);
        this.sceneryGfx.lineTo(660, 375);
        this.sceneryGfx.lineTo(680, 358);
        this.sceneryGfx.lineTo(700, 340);
        this.sceneryGfx.lineTo(720, 325);
        this.sceneryGfx.lineTo(745, 315);
        this.sceneryGfx.lineTo(760, 310);
        this.sceneryGfx.strokePath();

        // 6. Footprints along the path
        this.sceneryGfx.fillStyle(0xcbd5e1, 0.35);
        const footprintPairs = [
            { x: 655, y: 380 },
            { x: 668, y: 365 },
            { x: 685, y: 350 },
            { x: 700, y: 335 },
            { x: 718, y: 322 },
            { x: 738, y: 312 }
        ];

        for (const pair of footprintPairs)
        {
            this.sceneryGfx.fillEllipse(pair.x - 3, pair.y, 4, 6);
            this.sceneryGfx.fillEllipse(pair.x + 3, pair.y, 4, 6);
        }

        // 7. Hut structures (walls, roofs, chimneys)
        for (const hut of this.huts)
        {
            // Chimney (behind roof)
            this.sceneryGfx.fillStyle(0x334155, 1.0);
            this.sceneryGfx.fillRect(hut.chimney.x, hut.chimney.y, hut.chimney.w, hut.chimney.h);

            // Wall
            this.sceneryGfx.fillStyle(hut.wallColor, 1.0);
            this.sceneryGfx.fillRect(hut.wallX, hut.wallY, hut.wallW, hut.wallH);

            // Roof
            this.sceneryGfx.fillStyle(0x334155, 1.0);
            this.sceneryGfx.fillTriangle(
                hut.roofLeft.x, hut.roofLeft.y,
                hut.roofPeak.x, hut.roofPeak.y,
                hut.roofRight.x, hut.roofRight.y
            );

            // Roof snow cap
            this.sceneryGfx.fillStyle(0xf0f9ff, 0.7);
            const peakX = hut.roofPeak.x;
            const peakY = hut.roofPeak.y;
            const midY = peakY + (hut.roofLeft.y - peakY) * 0.35;
            const leftX = hut.roofLeft.x + (peakX - hut.roofLeft.x) * 0.35;
            const rightX = hut.roofRight.x - (hut.roofRight.x - peakX) * 0.35;
            this.sceneryGfx.fillTriangle(leftX, midY, peakX, peakY - 2, rightX, midY);
        }
    }

    private createWindows(): void
    {
        for (const hut of this.huts)
        {
            for (const win of hut.windows)
            {
                const rect = this.scene.add.rectangle(
                    win.x + win.w / 2,
                    win.y + win.h / 2,
                    win.w, win.h,
                    0xfbbf24, 0.8
                );
                this.add(rect);
                this.windowRects.push(rect);
            }
        }
    }

    private createSmoke(): void
    {
        for (const hut of this.huts)
        {
            for (let i = 0; i < 4; i++)
            {
                const circle = this.scene.add.circle(
                    hut.smokeOrigin.x,
                    hut.smokeOrigin.y,
                    4,
                    0xcbd5e1,
                    0
                );
                this.add(circle);
                this.smokePuffs.push(circle);
            }
        }
    }

    private createSnow(): void
    {
        for (let i = 0; i < 35; i++)
        {
            const x = PhaserMath.Between(0, 1024);
            const y = PhaserMath.Between(50, 578);
            const radius = PhaserMath.FloatBetween(1, 2.5);
            const alpha = PhaserMath.FloatBetween(0.3, 0.7);

            const flake = this.scene.add.circle(x, y, radius, 0xffffff, alpha);
            this.add(flake);

            this.snowflakes.push({
                circle: flake,
                baseX: x,
                speed: PhaserMath.FloatBetween(15, 40),
                sway: PhaserMath.FloatBetween(5, 20),
                swaySpeed: PhaserMath.FloatBetween(0.5, 2.0)
            });
        }
    }

    private startAnimations(): void
    {
        // Window flicker tweens
        for (const win of this.windowRects)
        {
            this.scene.tweens.add({
                targets: win,
                alpha: { from: 0.5, to: 1.0 },
                duration: PhaserMath.Between(800, 1500),
                delay: PhaserMath.Between(0, 1000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Smoke puffs (staggered per hut)
        let puffIndex = 0;
        for (const hut of this.huts)
        {
            for (let i = 0; i < 4; i++)
            {
                const circle = this.smokePuffs[puffIndex++];
                this.scene.time.delayedCall(PhaserMath.Between(0, 2500), () => {
                    this.tweenSmokePuff(circle, hut.smokeOrigin);
                });
            }
        }

        // Snow timer
        this.snowTimer = this.scene.time.addEvent({
            delay: 16,
            callback: this.updateSnow,
            callbackScope: this,
            loop: true
        });
    }

    private tweenSmokePuff(circle: GameObjects.Arc, origin: { x: number; y: number }): void
    {
        circle.setPosition(origin.x + PhaserMath.Between(-3, 3), origin.y);
        circle.setAlpha(0.4);
        circle.setScale(1);

        this.scene.tweens.add({
            targets: circle,
            y: origin.y - PhaserMath.Between(45, 70),
            x: origin.x + PhaserMath.Between(-18, 18),
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: PhaserMath.Between(2000, 3500),
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.visible)
                {
                    this.tweenSmokePuff(circle, origin);
                }
            }
        });
    }

    private updateSnow(): void
    {
        const dt = 16 / 1000;
        const time = this.scene.time.now / 1000;

        for (const flake of this.snowflakes)
        {
            flake.circle.y += flake.speed * dt;
            flake.circle.x = flake.baseX + Math.sin(time * flake.swaySpeed) * flake.sway;

            if (flake.circle.y > 580)
            {
                flake.circle.y = 48;
                flake.baseX = PhaserMath.Between(0, 1024);
                flake.circle.x = flake.baseX;
            }
        }
    }

    public show(): void
    {
        this.setVisible(true);

        if (!this.snowTimer || this.snowTimer.hasDispatched)
        {
            this.snowTimer = this.scene.time.addEvent({
                delay: 16,
                callback: this.updateSnow,
                callbackScope: this,
                loop: true
            });
        }

        // Restart smoke puffs
        let puffIndex = 0;
        for (const hut of this.huts)
        {
            for (let i = 0; i < 4; i++)
            {
                const circle = this.smokePuffs[puffIndex++];
                this.tweenSmokePuff(circle, hut.smokeOrigin);
            }
        }

        // Restart window flicker
        for (const win of this.windowRects)
        {
            this.scene.tweens.add({
                targets: win,
                alpha: { from: 0.5, to: 1.0 },
                duration: PhaserMath.Between(800, 1500),
                delay: PhaserMath.Between(0, 1000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    public hide(): void
    {
        this.setVisible(false);

        this.snowTimer?.remove();
        this.snowTimer = null;

        this.smokePuffs.forEach(p => this.scene.tweens.killTweensOf(p));
        this.windowRects.forEach(w => this.scene.tweens.killTweensOf(w));
    }

    destroy(fromScene?: boolean): void
    {
        this.snowTimer?.remove();
        this.snowTimer = null;
        super.destroy(fromScene);
    }
}
