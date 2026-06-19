import { Scene, GameObjects, Math as PhaserMath } from 'phaser';

interface StalactiteData {
    x: number;
    tipY: number;
    baseWidth: number;
    height: number;
}

interface SnowflakeData {
    circle: GameObjects.Arc;
    baseX: number;
    speed: number;
    sway: number;
    swaySpeed: number;
}

interface DustMoteData {
    circle: GameObjects.Arc;
    baseX: number;
    baseY: number;
    driftX: number;
    driftY: number;
    speed: number;
}

export class HuntingBackground extends GameObjects.Container
{
    private sceneryGfx: GameObjects.Graphics;
    private snowflakes: SnowflakeData[] = [];
    private dustMotes: DustMoteData[] = [];
    private snowTimer: Phaser.Time.TimerEvent | null = null;
    private stalactites: StalactiteData[];
    private swayingStals: GameObjects.Graphics[] = [];

    constructor(scene: Scene)
    {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.stalactites = this.defineStalactites();
        this.drawStaticScenery();
        this.createSwayingStalactites();
        this.createSnow();
        this.createDustMotes();
        this.startAnimations();
    }

    private defineStalactites(): StalactiteData[]
    {
        return [
            // Left wall stalactites
            { x: 60, tipY: 130, baseWidth: 18, height: 55 },
            { x: 120, tipY: 115, baseWidth: 14, height: 45 },
            { x: 180, tipY: 140, baseWidth: 20, height: 60 },
            // Center stalactites (higher, larger)
            { x: 350, tipY: 105, baseWidth: 16, height: 50 },
            { x: 460, tipY: 95, baseWidth: 22, height: 65 },
            { x: 560, tipY: 110, baseWidth: 18, height: 55 },
            // Right wall stalactites
            { x: 750, tipY: 100, baseWidth: 20, height: 58 },
            { x: 850, tipY: 120, baseWidth: 16, height: 50 },
            { x: 930, tipY: 135, baseWidth: 22, height: 62 },
            { x: 980, tipY: 125, baseWidth: 14, height: 42 }
        ];
    }

    private drawStaticScenery(): void
    {
        this.sceneryGfx = this.scene.add.graphics();
        this.add(this.sceneryGfx);

        // 1. Cave interior dark fill
        this.sceneryGfx.fillStyle(0x1e293b, 1.0);
        this.sceneryGfx.fillRect(0, 50, 1024, 528);

        // 2. Cave opening in the back wall (bright arch showing outside)
        // Outer glow
        this.sceneryGfx.fillStyle(0xbfdbfe, 0.3);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.arc(512, 350, 180, Math.PI, 0, false);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Opening shape — bright sky visible through arch
        this.sceneryGfx.fillStyle(0xdbeafe, 0.9);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.arc(512, 350, 150, Math.PI, 0, false);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Inner sky gradient — lighter at top
        this.sceneryGfx.fillStyle(0xeff6ff, 0.6);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.arc(512, 350, 120, Math.PI, 0, false);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Distant mountains visible through the opening
        this.sceneryGfx.fillStyle(0x94a3b8, 0.7);
        this.sceneryGfx.fillTriangle(430, 350, 480, 250, 530, 350);
        this.sceneryGfx.fillStyle(0x64748b, 0.6);
        this.sceneryGfx.fillTriangle(490, 350, 540, 270, 590, 350);

        // Snow on distant mountains
        this.sceneryGfx.fillStyle(0xf0f9ff, 0.8);
        this.sceneryGfx.fillTriangle(465, 275, 480, 250, 495, 275);
        this.sceneryGfx.fillTriangle(520, 295, 540, 270, 560, 295);

        // Snowy ground visible through opening
        this.sceneryGfx.fillStyle(0xf0f9ff, 0.7);
        this.sceneryGfx.fillRect(362, 340, 300, 15);

        // 3. Cave walls (left side — rough rocky shape)
        this.sceneryGfx.fillStyle(0x334155, 1.0);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(0, 50);
        this.sceneryGfx.lineTo(200, 50);
        this.sceneryGfx.lineTo(220, 80);
        this.sceneryGfx.lineTo(190, 120);
        this.sceneryGfx.lineTo(210, 170);
        this.sceneryGfx.lineTo(180, 230);
        this.sceneryGfx.lineTo(200, 300);
        this.sceneryGfx.lineTo(170, 360);
        this.sceneryGfx.lineTo(150, 420);
        this.sceneryGfx.lineTo(130, 480);
        this.sceneryGfx.lineTo(100, 530);
        this.sceneryGfx.lineTo(80, 578);
        this.sceneryGfx.lineTo(0, 578);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Left wall highlight edge
        this.sceneryGfx.lineStyle(2, 0x475569, 0.6);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(200, 50);
        this.sceneryGfx.lineTo(220, 80);
        this.sceneryGfx.lineTo(190, 120);
        this.sceneryGfx.lineTo(210, 170);
        this.sceneryGfx.lineTo(180, 230);
        this.sceneryGfx.lineTo(200, 300);
        this.sceneryGfx.lineTo(170, 360);
        this.sceneryGfx.lineTo(150, 420);
        this.sceneryGfx.lineTo(130, 480);
        this.sceneryGfx.lineTo(100, 530);
        this.sceneryGfx.lineTo(80, 578);
        this.sceneryGfx.strokePath();

        // Cave walls (right side)
        this.sceneryGfx.fillStyle(0x334155, 1.0);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(1024, 50);
        this.sceneryGfx.lineTo(820, 50);
        this.sceneryGfx.lineTo(800, 85);
        this.sceneryGfx.lineTo(830, 130);
        this.sceneryGfx.lineTo(810, 180);
        this.sceneryGfx.lineTo(840, 240);
        this.sceneryGfx.lineTo(820, 310);
        this.sceneryGfx.lineTo(850, 370);
        this.sceneryGfx.lineTo(870, 430);
        this.sceneryGfx.lineTo(900, 490);
        this.sceneryGfx.lineTo(940, 540);
        this.sceneryGfx.lineTo(960, 578);
        this.sceneryGfx.lineTo(1024, 578);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Right wall highlight edge
        this.sceneryGfx.lineStyle(2, 0x475569, 0.6);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(820, 50);
        this.sceneryGfx.lineTo(800, 85);
        this.sceneryGfx.lineTo(830, 130);
        this.sceneryGfx.lineTo(810, 180);
        this.sceneryGfx.lineTo(840, 240);
        this.sceneryGfx.lineTo(820, 310);
        this.sceneryGfx.lineTo(850, 370);
        this.sceneryGfx.lineTo(870, 430);
        this.sceneryGfx.lineTo(900, 490);
        this.sceneryGfx.lineTo(940, 540);
        this.sceneryGfx.lineTo(960, 578);
        this.sceneryGfx.strokePath();

        // 4. Cave ceiling
        this.sceneryGfx.fillStyle(0x334155, 1.0);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(0, 50);
        this.sceneryGfx.lineTo(1024, 50);
        this.sceneryGfx.lineTo(1024, 70);
        this.sceneryGfx.lineTo(900, 65);
        this.sceneryGfx.lineTo(750, 58);
        this.sceneryGfx.lineTo(600, 68);
        this.sceneryGfx.lineTo(450, 55);
        this.sceneryGfx.lineTo(300, 65);
        this.sceneryGfx.lineTo(150, 58);
        this.sceneryGfx.lineTo(0, 68);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // 5. Static stalactites
        for (const stal of this.stalactites)
        {
            this.sceneryGfx.fillStyle(0x475569, 0.9);
            this.sceneryGfx.fillTriangle(
                stal.x - stal.baseWidth / 2, 50,
                stal.x, stal.tipY,
                stal.x + stal.baseWidth / 2, 50
            );

            // Highlight edge
            this.sceneryGfx.lineStyle(1, 0x64748b, 0.4);
            this.sceneryGfx.beginPath();
            this.sceneryGfx.moveTo(stal.x - stal.baseWidth / 2, 50);
            this.sceneryGfx.lineTo(stal.x, stal.tipY);
            this.sceneryGfx.strokePath();
        }

        // 6. Cave floor
        this.sceneryGfx.fillStyle(0x0f172a, 1.0);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(0, 530);
        this.sceneryGfx.lineTo(120, 520);
        this.sceneryGfx.lineTo(280, 525);
        this.sceneryGfx.lineTo(420, 518);
        this.sceneryGfx.lineTo(550, 522);
        this.sceneryGfx.lineTo(700, 516);
        this.sceneryGfx.lineTo(850, 520);
        this.sceneryGfx.lineTo(1024, 525);
        this.sceneryGfx.lineTo(1024, 578);
        this.sceneryGfx.lineTo(0, 578);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // Floor rocky texture lines
        this.sceneryGfx.lineStyle(1, 0x1e293b, 0.5);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(100, 545);
        this.sceneryGfx.lineTo(250, 540);
        this.sceneryGfx.lineTo(400, 548);
        this.sceneryGfx.strokePath();

        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(550, 538);
        this.sceneryGfx.lineTo(700, 545);
        this.sceneryGfx.lineTo(900, 540);
        this.sceneryGfx.strokePath();

        // Snow drifted in near the entrance area (center-bottom)
        this.sceneryGfx.fillStyle(0xf0f9ff, 0.3);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(380, 525);
        this.sceneryGfx.lineTo(430, 518);
        this.sceneryGfx.lineTo(510, 515);
        this.sceneryGfx.lineTo(590, 518);
        this.sceneryGfx.lineTo(640, 525);
        this.sceneryGfx.lineTo(640, 540);
        this.sceneryGfx.lineTo(380, 540);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();

        // 7. Rocky debris on cave floor
        this.drawRock(200, 535, 18, 10);
        this.drawRock(750, 530, 22, 12);
        this.drawRock(400, 538, 14, 8);
        this.drawRock(880, 540, 16, 9);
    }

    private drawRock(x: number, y: number, w: number, h: number): void
    {
        this.sceneryGfx.fillStyle(0x334155, 0.7);
        this.sceneryGfx.beginPath();
        this.sceneryGfx.moveTo(x - w / 2, y);
        this.sceneryGfx.lineTo(x - w / 3, y - h);
        this.sceneryGfx.lineTo(x + w / 4, y - h * 0.8);
        this.sceneryGfx.lineTo(x + w / 2, y);
        this.sceneryGfx.closePath();
        this.sceneryGfx.fillPath();
    }

    private createSwayingStalactites(): void
    {
        // A few extra stalactites drawn on separate Graphics for wind sway
        const swayData = [
            { x: 280, tipY: 125, baseWidth: 12, height: 48 },
            { x: 650, tipY: 108, baseWidth: 14, height: 52 },
            { x: 420, tipY: 118, baseWidth: 10, height: 40 }
        ];

        for (const stal of swayData)
        {
            const gfx = this.scene.add.graphics();
            gfx.fillStyle(0x475569, 0.85);
            gfx.fillTriangle(
                -stal.baseWidth / 2, 0,
                0, stal.height,
                stal.baseWidth / 2, 0
            );
            gfx.setPosition(stal.x, 50);
            this.add(gfx);
            this.swayingStals.push(gfx);
        }
    }

    private createSnow(): void
    {
        // Snow drifting in from the cave entrance — concentrated in center
        for (let i = 0; i < 25; i++)
        {
            const x = PhaserMath.Between(300, 720);
            const y = PhaserMath.Between(50, 520);
            const radius = PhaserMath.FloatBetween(1, 2.5);
            const alpha = PhaserMath.FloatBetween(0.2, 0.6);

            const flake = this.scene.add.circle(x, y, radius, 0xffffff, alpha);
            this.add(flake);

            this.snowflakes.push({
                circle: flake,
                baseX: x,
                speed: PhaserMath.FloatBetween(12, 30),
                sway: PhaserMath.FloatBetween(8, 25),
                swaySpeed: PhaserMath.FloatBetween(0.5, 1.8)
            });
        }
    }

    private createDustMotes(): void
    {
        // Dust particles floating deeper in the cave (outside the snow zone)
        for (let i = 0; i < 15; i++)
        {
            const x = PhaserMath.Between(80, 940);
            const y = PhaserMath.Between(100, 500);
            const radius = PhaserMath.FloatBetween(0.8, 1.5);
            const alpha = PhaserMath.FloatBetween(0.1, 0.3);

            const mote = this.scene.add.circle(x, y, radius, 0x94a3b8, alpha);
            this.add(mote);

            this.dustMotes.push({
                circle: mote,
                baseX: x,
                baseY: y,
                driftX: PhaserMath.FloatBetween(-15, 15),
                driftY: PhaserMath.FloatBetween(-10, 10),
                speed: PhaserMath.FloatBetween(0.3, 0.8)
            });
        }
    }

    private startAnimations(): void
    {
        // Wind sway on stalactites
        for (const gfx of this.swayingStals)
        {
            this.scene.tweens.add({
                targets: gfx,
                angle: { from: -1.5, to: 1.5 },
                duration: PhaserMath.Between(2000, 3500),
                delay: PhaserMath.Between(0, 1000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Snow + dust timer
        this.snowTimer = this.scene.time.addEvent({
            delay: 16,
            callback: this.updateParticles,
            callbackScope: this,
            loop: true
        });
    }

    private updateParticles(): void
    {
        const dt = 16 / 1000;
        const time = this.scene.time.now / 1000;

        // Snow falling from entrance
        for (const flake of this.snowflakes)
        {
            flake.circle.y += flake.speed * dt;
            flake.circle.x = flake.baseX + Math.sin(time * flake.swaySpeed) * flake.sway;

            if (flake.circle.y > 525)
            {
                flake.circle.y = 50;
                flake.baseX = PhaserMath.Between(350, 680);
                flake.circle.x = flake.baseX;
            }
        }

        // Dust motes drifting slowly
        for (const mote of this.dustMotes)
        {
            mote.circle.x = mote.baseX + Math.sin(time * mote.speed) * mote.driftX;
            mote.circle.y = mote.baseY + Math.cos(time * mote.speed * 0.7) * mote.driftY;
        }
    }

    public show(): void
    {
        this.setVisible(true);

        if (!this.snowTimer || this.snowTimer.hasDispatched)
        {
            this.snowTimer = this.scene.time.addEvent({
                delay: 16,
                callback: this.updateParticles,
                callbackScope: this,
                loop: true
            });
        }

        // Restart stalactite sway
        for (const gfx of this.swayingStals)
        {
            this.scene.tweens.add({
                targets: gfx,
                angle: { from: -1.5, to: 1.5 },
                duration: PhaserMath.Between(2000, 3500),
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

        this.swayingStals.forEach(g => this.scene.tweens.killTweensOf(g));
    }

    destroy(fromScene?: boolean): void
    {
        this.snowTimer?.remove();
        this.snowTimer = null;
        super.destroy(fromScene);
    }
}
