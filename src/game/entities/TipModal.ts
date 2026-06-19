import { Scene, GameObjects, Geom } from 'phaser';
import { Button } from './Button';

interface TipLine {
    icon: string;
    text: string;
}

interface TipConfig {
    title: string;
    tips: TipLine[];
}

const TIPS: Record<string, TipConfig> = {
    town: {
        title: 'WELCOME TO TOWN',
        tips: [
            { icon: '⚔️', text: 'Go Hunting — fight monsters to earn XP and gold' },
            { icon: '🔨', text: 'Work — complete timed shifts for guaranteed gold and XP' },
            { icon: '🧪', text: 'Buy Potions — spend gold on healing potions for combat' },
            { icon: '❤️', text: 'Heal — fully restore your HP for free while in town' },
            { icon: '⭐', text: 'Spend Stats — allocate stat points when you level up' }
        ]
    },
    hunting: {
        title: 'COMBAT GUIDE',
        tips: [
            { icon: '⏱️', text: 'ATB bars fill over time — attacks happen automatically when full' },
            { icon: '🎯', text: 'ATB speed is based on DEX, damage is based on STR' },
            { icon: '🧪', text: 'Use Potion — drink a healing potion to restore 30 HP' },
            { icon: '🔄', text: 'Auto-Potion — toggle automatic potion use at a set HP threshold' },
            { icon: '🏃', text: 'Flee — escape combat and return safely to town' }
        ]
    },
    working: {
        title: 'WORK SHIFT',
        tips: [
            { icon: '⏳', text: 'Wait for the progress bar to finish to earn your rewards' },
            { icon: '💰', text: 'Longer shifts pay more gold and XP per second' },
            { icon: '❌', text: 'Cancelling a shift early forfeits all rewards' }
        ]
    }
};

export class TipModal extends GameObjects.Container
{
    private backdrop: GameObjects.Graphics;
    private onDismiss: () => void;

    constructor(scene: Scene, screenKey: string, onDismiss: () => void)
    {
        super(scene, 512, 384);
        scene.add.existing(this);
        this.onDismiss = onDismiss;

        const config = TIPS[screenKey];
        if (!config) { this.destroy(); return; }

        this.createUI(config);
    }

    private createUI(config: TipConfig): void
    {
        const tipCount = config.tips.length;
        const lineHeight = 38;
        const contentHeight = tipCount * lineHeight;
        const panelHeight = contentHeight + 140;
        const panelWidth = 460;
        const halfW = panelWidth / 2;
        const halfH = panelHeight / 2;

        // 1. Full-screen backdrop
        this.backdrop = this.scene.add.graphics();
        this.backdrop.fillStyle(0x000000, 0.65);
        this.backdrop.fillRect(-512, -384, 1024, 768);
        this.backdrop.setInteractive(
            new Geom.Rectangle(-512, -384, 1024, 768),
            Geom.Rectangle.Contains
        );
        this.add(this.backdrop);

        // 2. Modal panel
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x0f172a, 0.97);
        panel.fillRoundedRect(-halfW, -halfH, panelWidth, panelHeight, 16);
        panel.lineStyle(3, 0x38bdf8, 1.0);
        panel.strokeRoundedRect(-halfW, -halfH, panelWidth, panelHeight, 16);
        this.add(panel);

        // 3. Title
        const title = this.scene.add.text(0, -halfH + 30, config.title, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#38bdf8'
        }).setOrigin(0.5);
        this.add(title);

        // 4. Separator line
        const sep = this.scene.add.graphics();
        sep.lineStyle(1, 0x334155, 1.0);
        sep.beginPath();
        sep.moveTo(-halfW + 25, -halfH + 55);
        sep.lineTo(halfW - 25, -halfH + 55);
        sep.strokePath();
        this.add(sep);

        // 5. Tip lines
        const startY = -halfH + 75;
        for (let i = 0; i < config.tips.length; i++)
        {
            const tip = config.tips[i];
            const y = startY + i * lineHeight;

            const icon = this.scene.add.text(-halfW + 30, y, tip.icon, {
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '16px'
            }).setOrigin(0, 0);
            this.add(icon);

            const text = this.scene.add.text(-halfW + 60, y, tip.text, {
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                color: '#cbd5e1',
                wordWrap: { width: panelWidth - 100 }
            }).setOrigin(0, 0);
            this.add(text);
        }

        // 6. Got it button
        const btn = new Button(this.scene, 0, halfH - 40, 'Got it!', () => {
            this.dismiss();
        }, 140, 45);
        this.add(btn);

        // Fade in
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 250,
            ease: 'Quad.easeOut'
        });
    }

    private dismiss(): void
    {
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 200,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.onDismiss();
                this.destroy();
            }
        });
    }
}
