import { Scene, Math as PhaserMath} from 'phaser';
import { Button } from '../entities/Button';
import { CombatCard } from '../entities/CombatCard';
import { QuantityModal } from '../entities/QuantityModal';
import { TownBackground } from '../entities/TownBackground';
import { HuntingBackground } from '../entities/HuntingBackground';
import { WorkBackground } from '../entities/WorkBackground';
import { TipModal } from '../entities/TipModal';

enum GameState
{
    Town,
    Hunting,
    Working
};

interface ILayoutManager
{
    layout(buttons: Button[]): void;
}


class Entity {
    
    hp: number = 100;
    maxHp: number = 100;
    statPoints: number = 0;
    xp: number = 0;

    constructor(
        public name: string,
        public int: number,
        public str: number,
        public dex: number,
        public vit: number,
        public level: number = 1
    ) {
        this.maxHp = 10 + vit * 2;
        this.hp = this.maxHp;
    }

    takeDamage(amount: number) {
        this.hp -= amount;
        if (this.hp < 0) {
            this.hp = 0;
        }
    }

    heal(amount: number) {
        this.hp += amount;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
    }

    getXpRequiredForLevel(lvl: number): number {
        if (lvl >= 100) return Infinity;
        return Math.floor(100 * Math.pow(lvl, 1.5));
    }

    gainXp(amount: number): { leveledUp: boolean, levelsGained: number } {
        this.xp += amount;
        let leveledUp = false;
        let levelsGained = 0;

        while (this.level < 100 && this.xp >= this.getXpRequiredForLevel(this.level)) {
            const required = this.getXpRequiredForLevel(this.level);
            this.xp -= required;
            this.levelUp();
            leveledUp = true;
            levelsGained++;
        }

        return { leveledUp, levelsGained };
    }

    levelUp() {
        this.level++;
        this.maxHp += 10;
        this.statPoints += 5;
        this.hp = this.maxHp;
    }

    calculateDamage(): number {
        //make a simple damage formula based on strength and level
        const baseDamage = this.str * 2;
        const randomFactor = PhaserMath.Between(0, 5) * this.level;
        return baseDamage + randomFactor;
    }

}

class VerticalLayoutManager implements ILayoutManager
{
    constructor(private startX: number = 512, private startY: number = 450, private spacing: number = 80) {}

    layout(buttons: Button[]): void
    {
        buttons.forEach((button, index) => {
            button.setPosition(this.startX, this.startY + index * this.spacing);
        });
    }
}

class HorizontalLayoutManager implements ILayoutManager
{
    constructor(private startX: number = 300, private spacing: number = 150) {}

    layout(buttons: Button[]): void
    {
        buttons.forEach((button, index) => {
            button.setPosition(this.startX + index * this.spacing, 500);
        });
    }
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    private townBackground: TownBackground | null = null;
    private huntingBackground: HuntingBackground | null = null;
    private workBackground: WorkBackground | null = null;
    msg_text : Phaser.GameObjects.Text;
    private chatBoxBg: Phaser.GameObjects.Graphics;
    private chatBoxHeader: Phaser.GameObjects.Text;
    private logMessages: string[] = [];
    private lastLoggedState: GameState | null = null;
    gameState: GameState;
    buttons: Button[] = [];
    layoutManager: ILayoutManager;
    player: Entity;
    enemies: Entity[] = [];
    enemyCards: CombatCard[] = [];
    playerCard: CombatCard | null = null;
    private isCombatActionLocked: boolean = false;
    private autoPotionThreshold: number = 0;

    // Economy state
    gold: number = 50;
    potions: number = 3;

    // HUD game objects
    private hudBackground: Phaser.GameObjects.Graphics;
    private hudLevelText: Phaser.GameObjects.Text;
    private hudGoldText: Phaser.GameObjects.Text;
    private hudPotionsText: Phaser.GameObjects.Text;
    private statModalContainer: Phaser.GameObjects.Container | null = null;
    private purchaseModalContainer: QuantityModal | null = null;
    private xpBarGraphics: Phaser.GameObjects.Graphics;
    private currentXpPercent: number = 0;

    // Work state and properties
    private workGoldReward: number = 0;
    private workXpReward: number = 0;
    private workProgress: number = 0;
    private workTween: Phaser.Tweens.Tween | null = null;
    private workTimerText: Phaser.GameObjects.Text | null = null;
    private workProgressGraphics: Phaser.GameObjects.Graphics | null = null;
    private workModalContainer: Phaser.GameObjects.Container | null = null;

    // Tips state
    private tipsShown: Record<string, boolean> = {};
    private activeTipModal: TipModal | null = null;
    private hudHelpText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x0f172a);

        this.townBackground = new TownBackground(this);
        this.huntingBackground = new HuntingBackground(this);
        this.huntingBackground.hide();
        this.workBackground = new WorkBackground(this);
        this.workBackground.setVisible(false);
        this.gameState = GameState.Town;
        this.player = new Entity('Player', 5, 5, 5, 5);
        
        // Chat Log Background Graphics
        this.chatBoxBg = this.add.graphics();

        // Chat Log Header Text
        this.chatBoxHeader = this.add.text(0, 0, 'LOG', {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#38bdf8' // Sky-400
        }).setOrigin(0.5);

        // Chat Log Message Text
        this.msg_text = this.add.text(0, 0, '', {
            fontFamily: 'Courier New, Courier, monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#cbd5e1', // Slate-300
            lineSpacing: 4
        });

        // Initialize chat box position and drawing
        this.updateChatBox();

        // Welcome message
        this.addLogMessage('Welcome to Town Dweller! Go hunting or work to earn gold.');

        this.createHUD();
        this.updateUI();
    }

    update (_time: number, delta: number)
    {
        if (this.activeTipModal) return;
        if (this.gameState !== GameState.Hunting || this.isCombatActionLocked) return;

        // Check for Auto-Potion usage
        if (this.autoPotionThreshold > 0 && this.potions > 0 && this.player.hp > 0)
        {
            const hpPct = (this.player.hp / this.player.maxHp) * 100;
            if (hpPct <= this.autoPotionThreshold && this.player.hp < this.player.maxHp)
            {
                this.usePotionAction(true);
                return;
            }
        }

        // 1. Tick player ATB progress
        if (this.playerCard)
        {
            this.playerCard.atbProgress += delta / this.playerCard.speedMs;
            if (this.playerCard.atbProgress >= 1.0)
            {
                this.playerCard.atbProgress = 0;
                this.playerCard.updateAtb(0);
                this.executePlayerAttack();
                return;
            }
            else
            {
                this.playerCard.updateAtb(this.playerCard.atbProgress);
            }
        }

        // 2. Tick enemy ATB progress
        for (let i = 0; i < this.enemyCards.length; i++)
        {
            const enemyCard = this.enemyCards[i];
            const enemy = this.enemies[i];
            if (enemyCard && enemy && enemy.hp > 0)
            {
                enemyCard.atbProgress += delta / enemyCard.speedMs;
                if (enemyCard.atbProgress >= 1.0)
                {
                    enemyCard.atbProgress = 0;
                    enemyCard.updateAtb(0);
                    this.executeEnemyAttack(i);
                    return;
                }
                else
                {
                    enemyCard.updateAtb(enemyCard.atbProgress);
                }
            }
        }
    }

    updateUI ()
    {
        // Show/hide backgrounds based on state
        if (this.townBackground)
        {
            if (this.gameState === GameState.Town) { this.townBackground.show(); }
            else { this.townBackground.hide(); }
        }
        if (this.huntingBackground)
        {
            if (this.gameState === GameState.Hunting) { this.huntingBackground.show(); }
            else { this.huntingBackground.hide(); }
        }
        if (this.workBackground)
        {
            if (this.gameState === GameState.Working) { this.workBackground.show(); }
            else { this.workBackground.hide(); }
        }

        // Clear existing buttons
        this.buttons.forEach(button => button.destroy());
        this.buttons = [];

        // Clear work progress elements if not in Working state
        if (this.gameState !== GameState.Working)
        {
            this.workProgressGraphics?.destroy();
            this.workProgressGraphics = null;
            this.workTimerText?.destroy();
            this.workTimerText = null;
        }

        // Clear purchase modal if not in Town state
        if (this.gameState !== GameState.Town)
        {
            this.purchaseModalContainer?.destroy();
            this.purchaseModalContainer = null;
        }

        // Show player card at the town/work screen
        if (this.gameState === GameState.Town || this.gameState === GameState.Working)
        {
            if (!this.playerCard)
            {
                this.playerCard = new CombatCard(
                    this,
                    512, 140,
                    'Player',
                    this.player.hp, this.player.maxHp,
                    this.player.level,
                    this.player.dex,
                    true // isPlayer
                );
                this.playerCard.slideIn(512, -100, 0); // Slide in from top
            }
            else
            {
                this.playerCard.setPosition(512, 140);
                this.playerCard.setVisible(true);
                this.playerCard.updateMaxHp(this.player.maxHp);
                this.playerCard.updateHp(this.player.hp, false);
                this.playerCard.updateLevel(this.player.level);
            }
        }

        this.updateChatBox();

        if (this.gameState !== this.lastLoggedState)
        {
            this.lastLoggedState = this.gameState;
            if (this.gameState === GameState.Town)
            {
                this.addLogMessage('Welcome to the town! Click the button to go hunting!');
                if (this.player.hp < this.player.maxHp)
                {
                    this.player.hp = this.player.maxHp;
                    this.addLogMessage(`You rest and fully heal. HP: ${this.player.hp}/${this.player.maxHp}`);
                    if (this.playerCard)
                    {
                        this.playerCard.updateHp(this.player.hp, false);
                        this.playerCard.flashHeal();
                    }
                }
            }
            else if (this.gameState === GameState.Hunting)
            {
                this.addLogMessage('You are now hunting! Good luck!');
            }
            else if (this.gameState === GameState.Working)
            {
                this.addLogMessage('Working hard in the town... Do not click away or cancel.');
            }

            this.showTipForCurrentState(false);
        }

        if (this.gameState === GameState.Town)
        {
            this.createTownButtons();

            // Auto-trigger stat modal if player has unspent points
            if (this.player.statPoints > 0 && !this.statModalContainer)
            {
                this.showStatModal();
            }
        }
        else if (this.gameState === GameState.Hunting)
        {
            // ensure enemies exist for this hunt and build combat UI
            this.spawnEnemiesForHunt();
            this.createCombatUI();
            this.createHuntingButtons();
        }
        else if (this.gameState === GameState.Working)
        {
            // Create Cancel button
            const cancelBtn = new Button(this, 512, 370, 'Cancel Work', () => {
                this.cancelWorkAction();
            });
            this.buttons.push(cancelBtn);
        }
    }

    private createTownButtons ()
    {
        this.layoutManager = new VerticalLayoutManager(140, 260, 70);
        
        const huntBtn = new Button(this, 0, 0, 'Go hunting!', () => {
            this.gameState = GameState.Hunting;
            this.updateUI();
        });
        this.buttons.push(huntBtn);

        const workBtn = new Button(this, 0, 0, 'Work', () => {
            this.showWorkModal();
        });
        this.buttons.push(workBtn);

        // If player has stat points, show Spend Stats button instead of Potion Shop
        if (this.player.statPoints > 0)
        {
            const spendStatsBtn = new Button(this, 0, 0, `Spend Stats (${this.player.statPoints})`, () => {
                this.showStatModal();
            });
            this.buttons.push(spendStatsBtn);
        }
        else
        {
            const buyPotionBtn = new Button(this, 0, 0, 'Buy Potions (15 Gold)', () => {
                if (this.gold >= 15) {
                    if (this.purchaseModalContainer) {
                        this.purchaseModalContainer.destroy();
                    }
                    this.purchaseModalContainer = new QuantityModal(this, 512, 384, {
                        minQty: 1,
                        maxQty: Math.floor(this.gold / 15),
                        unitPrice: 15,
                        onConfirm: (quantity: number) => {
                            if (this.purchaseModalContainer) {
                                this.purchaseModalContainer.destroy();
                                this.purchaseModalContainer = null;
                            }
                            const totalCost = quantity * 15;
                            if (this.gold >= totalCost) {
                                this.gold -= totalCost;
                                this.potions += quantity;
                                this.updateHUD();
                                this.addLogMessage(`You bought ${quantity} Healing Potions! Gold: 💰${this.gold} | Potions: 🧪${this.potions}`);
                            } else {
                                this.addLogMessage(`Not enough Gold! You need ${totalCost} Gold to purchase ${quantity} potions.`);
                            }
                            this.updateUI();
                        },
                        onCancel: () => {
                            if (this.purchaseModalContainer) {
                                this.purchaseModalContainer.destroy();
                                this.purchaseModalContainer = null;
                            }
                            this.updateUI();
                        }
                    });
                } else {
                    this.addLogMessage(`Not enough Gold! You need 15 Gold to purchase a healing potion.`);
                }
            });
            this.buttons.push(buyPotionBtn);
        }

        const healButton = new Button(this, 0, 0, 'Heal', () => {
            if (this.player.hp >= this.player.maxHp) {
                this.addLogMessage('Your health is already full!');
                return;
            }
            this.player.hp = this.player.maxHp;
            this.addLogMessage(`You rested and fully healed! HP: ${this.player.hp}/${this.player.maxHp}`);
            if (this.playerCard) {
                this.playerCard.updateHp(this.player.hp);
                this.playerCard.flashHeal();
            }
        });
        this.buttons.push(healButton);
        this.layoutManager.layout(this.buttons);
    }

    private createHuntingButtons ()
    {
        // Buttons laid out horizontally under combat UI
        this.layoutManager = new HorizontalLayoutManager(240, 270);

        const potionBtn = new Button(this, 0, 0, 'Use Potion', () => {
            this.usePotionAction();
        });
        this.buttons.push(potionBtn);

        const getAutoPotionLabel = (threshold: number) => {
            return threshold === 0 ? 'Auto: Off' : `Auto: ${threshold}% HP`;
        };

        const autoPotionBtn = new Button(this, 0, 0, getAutoPotionLabel(this.autoPotionThreshold), () => {
            if (this.autoPotionThreshold === 0) this.autoPotionThreshold = 30;
            else if (this.autoPotionThreshold === 30) this.autoPotionThreshold = 50;
            else if (this.autoPotionThreshold === 50) this.autoPotionThreshold = 70;
            else if (this.autoPotionThreshold === 70) this.autoPotionThreshold = 90;
            else this.autoPotionThreshold = 0;

            autoPotionBtn.setLabel(getAutoPotionLabel(this.autoPotionThreshold));
        });
        this.buttons.push(autoPotionBtn);

        const fleeBtn = new Button(this, 0, 0, 'Flee', () => {
            this.fleeAction();
        });
        this.buttons.push(fleeBtn);

        this.layoutManager.layout(this.buttons);
    }

    private spawnEnemiesForHunt()
    {
        if (this.enemies.length === 0) {
            // spawn 2 enemies for variety
            this.enemies.push(this.generateEnemy(this.player.level));
            this.enemies.push(this.generateEnemy(this.player.level));
        }
    }

    private createHUD()
    {
        // Create Slate-900 status bar background
        this.hudBackground = this.add.graphics();
        this.hudBackground.fillStyle(0x0f172a, 0.9);
        this.hudBackground.fillRect(0, 0, 1024, 50);
        this.hudBackground.lineStyle(2, 0x1e293b, 1.0);
        this.hudBackground.lineBetween(0, 50, 1024, 50);

        // Level indicator
        this.hudLevelText = this.add.text(55, 25, `⭐ Lvl ${this.player.level}`, {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#38bdf8' // Sky-400
        });
        this.hudLevelText.setOrigin(0, 0.5);

        // Gold Balance indicator (centered)
        this.hudGoldText = this.add.text(512, 25, `💰 Gold: ${this.gold}`, {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#fbbf24' // Amber-400
        });
        this.hudGoldText.setOrigin(0.5, 0.5);

        // Potion Count indicator
        this.hudPotionsText = this.add.text(989, 25, `🧪 Potions: ${this.potions}`, {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#10b981' // Emerald-500
        });
        this.hudPotionsText.setOrigin(1, 0.5);

        // Help button
        this.hudHelpText = this.add.text(15, 25, '?', {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#94a3b8',
            backgroundColor: '#1e293b',
            padding: { x: 6, y: 2 }
        }).setOrigin(0.5, 0.5);
        this.hudHelpText.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.hudHelpText.setColor('#ffffff'))
            .on('pointerout', () => this.hudHelpText.setColor('#94a3b8'))
            .on('pointerdown', () => this.showTipForCurrentState(true));

        // Experience Bar graphics
        this.xpBarGraphics = this.add.graphics();
        const startXpPercent = this.player.xp / this.player.getXpRequiredForLevel(this.player.level);
        this.drawXPBar(startXpPercent);
    }

    private drawXPBar(percent: number)
    {
        this.xpBarGraphics.clear();

        // 1. Draw XP track background
        this.xpBarGraphics.fillStyle(0x1e293b, 1.0); // Slate-800
        this.xpBarGraphics.fillRect(0, 47, 1024, 3);

        // 2. Draw XP fill progress
        if (percent > 0)
        {
            this.xpBarGraphics.fillStyle(0x8b5cf6, 1.0); // Violet-500
            this.xpBarGraphics.fillRect(0, 47, 1024 * PhaserMath.Clamp(percent, 0, 1), 3);
        }
    }

    private updateHUD()
    {
        if (this.hudLevelText) {
            this.hudLevelText.setText(`⭐ Lvl ${this.player.level}`);
        }
        if (this.hudGoldText) {
            this.hudGoldText.setText(`💰 Gold: ${this.gold}`);
        }
        if (this.hudPotionsText) {
            this.hudPotionsText.setText(`🧪 Potions: ${this.potions}`);
        }

        // Redraw XP bar for current state
        const currentPercent = this.player.xp / this.player.getXpRequiredForLevel(this.player.level);
        this.drawXPBar(currentPercent);
    }

    private animateXpGain(startPercent: number, endPercent: number, levelsGained: number, onComplete: () => void)
    {
        this.currentXpPercent = startPercent;

        if (levelsGained > 0)
        {
            // Tween to full bar
            this.tweens.add({
                targets: this,
                currentXpPercent: 1.0,
                duration: 400 * (1 - startPercent),
                ease: 'Quad.easeOut',
                onUpdate: () => this.drawXPBar(this.currentXpPercent),
                onComplete: () => {
                    // Pulse player card on level up
                    if (this.playerCard) {
                        const reachedLevel = this.player.level - levelsGained + 1;
                        const intermediateMaxHp = this.player.maxHp - 10 * (levelsGained - 1);
                        this.playerCard.updateLevel(reachedLevel);
                        this.playerCard.updateMaxHp(intermediateMaxHp);
                        this.playerCard.updateHp(intermediateMaxHp, false);

                        this.playerCard.shake(200, 3);
                        this.playerCard.flashHeal(200);
                    }
                    this.updateHUD(); // Refresh HUD Level display

                    // Reset track and animate next phase
                    this.drawXPBar(0);
                    this.animateXpGain(0.0, endPercent, levelsGained - 1, onComplete);
                }
            });
        }
        else
        {
            // Simple XP fill tween
            this.tweens.add({
                targets: this,
                currentXpPercent: endPercent,
                duration: 600,
                ease: 'Quad.easeOut',
                onUpdate: () => this.drawXPBar(this.currentXpPercent),
                onComplete: () => {
                    if (onComplete) onComplete();
                }
            });
        }
    }

    private showStatModal()
    {
        if (this.statModalContainer) {
            this.statModalContainer.destroy();
        }

        // Center modal at (512, 384)
        const modal = this.add.container(512, 384);
        this.statModalContainer = modal;

        // 1. Draw background card
        const bg = this.add.graphics();
        bg.fillStyle(0x0f172a, 0.95);
        bg.fillRoundedRect(-180, -210, 360, 420, 16);
        bg.lineStyle(3, 0xf59e0b, 1.0); // Gold border
        bg.strokeRoundedRect(-180, -210, 360, 420, 16);
        modal.add(bg);

        // 2. Title
        const title = this.add.text(0, -170, 'LEVEL UP!', {
            fontFamily: 'system-ui, Arial, sans-serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#fbbf24'
        }).setOrigin(0.5);
        modal.add(title);

        // 3. Available points
        const pointsText = this.add.text(0, -130, `Available Points: ${this.player.statPoints}`, {
            fontFamily: 'system-ui, Arial, sans-serif',
            fontSize: '15px',
            color: '#94a3b8'
        }).setOrigin(0.5);
        modal.add(pointsText);

        // 4. Create Stat Rows
        const stats = [
            { name: 'str', label: 'Strength (STR)' },
            { name: 'dex', label: 'Dexterity (DEX)' },
            { name: 'vit', label: 'Vitality (VIT)' },
            { name: 'int', label: 'Intelligence (INT)' }
        ];

        const rowY = [-70, -20, 30, 80];
        const plusButtons: Phaser.GameObjects.Text[] = [];
        const valueTexts: Phaser.GameObjects.Text[] = [];

        stats.forEach((stat, idx) => {
            const yPos = rowY[idx];
            
            // Label
            const lbl = this.add.text(-140, yPos, stat.label, {
                fontFamily: 'system-ui, Arial, sans-serif',
                fontSize: '15px',
                color: '#e2e8f0'
            }).setOrigin(0, 0.5);
            modal.add(lbl);

            // Value text
            const val = this.add.text(40, yPos, `${(this.player as any)[stat.name]}`, {
                fontFamily: 'Courier New, monospace',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#f8fafc'
            }).setOrigin(1, 0.5);
            modal.add(val);
            valueTexts.push(val);

            // Plus Button
            const plus = this.add.text(110, yPos, ' + ', {
                fontFamily: 'Courier New, monospace',
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#fbbf24',
                backgroundColor: '#1e293b',
                padding: { x: 8, y: 4 }
            }).setOrigin(0.5);
            modal.add(plus);
            plusButtons.push(plus);

            // Click event
            plus.setInteractive({ useHandCursor: true })
                .on('pointerover', () => plus.setColor('#ffffff'))
                .on('pointerout', () => plus.setColor('#fbbf24'))
                .on('pointerdown', () => {
                    if (this.player.statPoints > 0) {
                        this.player.statPoints--;
                        (this.player as any)[stat.name]++;
                        
                        // If Vitality increases, recalculate max HP
                        if (stat.name === 'vit') {
                            const prevMax = this.player.maxHp;
                            this.player.maxHp = 10 + this.player.vit * 2;
                            const diff = this.player.maxHp - prevMax;
                            this.player.hp += diff; // Heal player by the difference
                            
                            if (this.playerCard) {
                                this.playerCard.updateMaxHp(this.player.maxHp);
                                this.playerCard.updateHp(this.player.hp, false);
                            }
                        }

                        // Update text elements
                        pointsText.setText(`Available Points: ${this.player.statPoints}`);
                        val.setText(`${(this.player as any)[stat.name]}`);

                        // Hide plus buttons if no points remain
                        if (this.player.statPoints <= 0) {
                            plusButtons.forEach(p => p.setVisible(false));
                        }
                    }
                });
        });

        // Hide plus buttons initially if no points
        if (this.player.statPoints <= 0) {
            plusButtons.forEach(p => p.setVisible(false));
        }

        // 5. Confirm button
        const confirmBtn = new Button(this, 0, 155, 'Confirm', () => {
            modal.destroy();
            this.statModalContainer = null;
            this.updateUI();
        });
        modal.add(confirmBtn);
    }

    private showWorkModal()
    {
        if (this.workModalContainer) {
            this.workModalContainer.destroy();
        }

        const modal = this.add.container(512, 384);
        this.workModalContainer = modal;

        // 1. Background Card
        const bg = this.add.graphics();
        bg.fillStyle(0x0f172a, 0.95);
        bg.fillRoundedRect(-180, -210, 360, 420, 16);
        bg.lineStyle(3, 0xf59e0b, 1.0); // Gold border
        bg.strokeRoundedRect(-180, -210, 360, 420, 16);
        modal.add(bg);

        // 2. Title
        const title = this.add.text(0, -165, 'TOWN JOBS', {
            fontFamily: 'system-ui, Arial, sans-serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#fbbf24'
        }).setOrigin(0.5);
        modal.add(title);

        const subtitle = this.add.text(0, -130, 'Choose a shift to earn rewards:', {
            fontFamily: 'system-ui, Arial, sans-serif',
            fontSize: '13px',
            color: '#94a3b8'
        }).setOrigin(0.5);
        modal.add(subtitle);

        // 3. Shift Options
        const shifts = [
            { label: 'Quick Job: 10s (+20g)', duration: 10000, gold: 20, xp: 10, y: -80 },
            { label: 'Half Shift: 30s (+70g)', duration: 30000, gold: 70, xp: 40, y: -15 },
            { label: 'Full Shift: 60s (+160g)', duration: 60000, gold: 160, xp: 100, y: 50 }
        ];

        shifts.forEach(shift => {
            const btn = new Button(this, 0, shift.y, shift.label, () => {
                modal.destroy();
                this.workModalContainer = null;
                this.startWorkAction(shift.duration, shift.gold, shift.xp);
            });
            modal.add(btn);
        });

        // 4. Back button
        const backBtn = new Button(this, 0, 145, 'Back', () => {
            modal.destroy();
            this.workModalContainer = null;
            this.updateUI();
        });
        modal.add(backBtn);
    }

    private startWorkAction(durationMs: number, goldReward: number, xpReward: number)
    {
        this.gameState = GameState.Working;
        this.workGoldReward = goldReward;
        this.workXpReward = xpReward;
        this.workProgress = 0;

        this.workBackground?.randomize();
        this.updateUI();

        // 1. Create Graphics object for progress bar
        if (!this.workProgressGraphics)
        {
            this.workProgressGraphics = this.add.graphics();
        }

        // 2. Create Countdown Text
        const durationSec = durationMs / 1000;
        if (!this.workTimerText)
        {
            this.workTimerText = this.add.text(512, 250, `Time Left: ${durationSec}s`, {
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '22px',
                fontStyle: 'bold',
                color: '#f8fafc'
            }).setOrigin(0.5);
        }

        // Initial draw
        this.drawWorkProgress(0);

        // 3. Create Tween to animate progress
        this.workTween = this.tweens.add({
            targets: this,
            workProgress: 1.0,
            duration: durationMs,
            ease: 'Linear',
            onUpdate: () => {
                this.drawWorkProgress(this.workProgress);
                const elapsed = this.workProgress * durationSec;
                const remaining = Math.ceil(durationSec - elapsed);
                if (this.workTimerText)
                {
                    this.workTimerText.setText(`Time Left: ${remaining}s`);
                }
            },
            onComplete: () => {
                this.completeWorkAction();
            }
        });
    }

    private drawWorkProgress(percent: number)
    {
        if (!this.workProgressGraphics) return;

        this.workProgressGraphics.clear();

        const barX = 512 - 150;
        const barY = 290;
        const barW = 300;
        const barH = 30;
        const radius = 8;

        // 1. Draw track background
        this.workProgressGraphics.fillStyle(0x1e293b, 1.0); // Slate-800
        this.workProgressGraphics.fillRoundedRect(barX, barY, barW, barH, radius);

        // 2. Draw progress fill
        if (percent > 0)
        {
            const fillW = barW * percent;
            this.workProgressGraphics.fillStyle(0x3b82f6, 1.0); // Blue-500
            this.workProgressGraphics.fillRoundedRect(barX, barY, Math.max(fillW, radius * 2), barH, radius);
        }

        // 3. Draw border
        this.workProgressGraphics.lineStyle(2, 0x3b82f6, 1.0); // Blue-500 border
        this.workProgressGraphics.strokeRoundedRect(barX, barY, barW, barH, radius);
    }

    private completeWorkAction()
    {
        // Add gold and update HUD
        this.gold += this.workGoldReward;
        this.updateHUD();

        // Animate XP gain
        const startPercent = this.player.xp / this.player.getXpRequiredForLevel(this.player.level);
        const xpResult = this.player.gainXp(this.workXpReward);
        const endPercent = this.player.xp / this.player.getXpRequiredForLevel(this.player.level);

        // Display floating rewards
        this.showFloatingDamage(512, 450, `+💰${this.workGoldReward}`, '#fbbf24');
        this.time.delayedCall(150, () => {
            this.showFloatingDamage(512, 450, `+${this.workXpReward} XP`, '#c084fc');
        });

        // Set message text
        this.addLogMessage(`Shift Completed!\nEarned 💰${this.workGoldReward} Gold & ⭐${this.workXpReward} XP!`);

        // Clean up graphics, text, tween
        this.workProgressGraphics?.destroy();
        this.workProgressGraphics = null;
        this.workTimerText?.destroy();
        this.workTimerText = null;
        this.workTween = null;

        // Clear buttons
        this.buttons.forEach(btn => btn.destroy());
        this.buttons = [];

        // Animate the XP bar and transition back to town
        this.animateXpGain(startPercent, endPercent, xpResult.levelsGained, () => {
            this.time.delayedCall(1200, () => {
                this.gameState = GameState.Town;
                this.updateUI();
            });
        });
    }

    private cancelWorkAction()
    {
        if (this.workTween)
        {
            this.workTween.stop();
            this.workTween = null;
        }

        // Clean up graphics and text
        this.workProgressGraphics?.destroy();
        this.workProgressGraphics = null;
        this.workTimerText?.destroy();
        this.workTimerText = null;

        // Return to town
        this.gameState = GameState.Town;
        this.updateUI();
    }

    private usePotionAction(isAuto: boolean = false)
    {
        if (this.potions <= 0) {
            if (!isAuto) {
                this.addLogMessage('No potions left! Buy some in town.');
            }
            return;
        }

        if (this.player.hp >= this.player.maxHp) {
            if (!isAuto) {
                this.addLogMessage('Your health is already full!');
            }
            return;
        }

        // Lock combat buttons during action
        this.buttons.forEach(btn => btn.disableInteractive());
        this.isCombatActionLocked = true;

        this.potions--;
        this.updateHUD();

        const healAmount = 30;
        this.player.heal(healAmount);

        let msg = isAuto
            ? `[Auto-Potion] Drank a Healing Potion and restored ${healAmount} HP!`
            : `You drank a Healing Potion and restored ${healAmount} HP!`;
        this.addLogMessage(msg);

        // Animate potion heal on player card
        if (this.playerCard) {
            this.playerCard.updateHp(this.player.hp);
            this.playerCard.flashHeal();
            this.showFloatingDamage(this.playerCard.x, this.playerCard.y - 45, `+${healAmount}`, '#10b981');
        }

        // Delay to allow animation to show, then resume combat
        this.time.delayedCall(800, () => {
            this.isCombatActionLocked = false;
            this.buttons.forEach(btn => btn.setInteractive({ useHandCursor: true }));
        });
    }

    private clearCombatUI()
    {
        this.enemyCards.forEach(card => card.destroy());
        this.enemyCards = [];

        if (this.playerCard) {
            this.playerCard.destroy();
            this.playerCard = null;
        }
    }

    private createCombatUI()
    {
        this.clearCombatUI();
        this.isCombatActionLocked = false;

        // 1. Create Player Card (slides in from left)
        this.playerCard = new CombatCard(
            this,
            320, 200,
            'Player',
            this.player.hp, this.player.maxHp,
            this.player.level,
            this.player.dex,
            true // isPlayer
        );
        this.playerCard.slideIn(-200, 200, 0);

        // 2. Create Enemy Cards (slide in from right with staggered delays)
        const enemyX = 700;
        const enemyStartY = 160;
        const spacingY = 95;

        this.enemies.forEach((enemy, idx) => {
            const card = new CombatCard(
                this,
                enemyX, enemyStartY + idx * spacingY,
                enemy.name,
                enemy.hp, enemy.maxHp,
                enemy.level,
                enemy.dex,
                false // isPlayer
            );
            this.enemyCards.push(card);
            card.slideIn(1200, card.y, idx * 150);
        });
    }



    private slideRemainingEnemyCards()
    {
        const enemyStartY = 160;
        const spacingY = 95;
        this.enemyCards.forEach((card, idx) => {
            this.tweens.add({
                targets: card,
                y: enemyStartY + idx * spacingY,
                duration: 300,
                ease: 'Quad.easeOut'
            });
        });
    }

    private showFloatingDamage(x:number, y:number, amount:number | string, color:string = '#ffffff')
    {
        const dmgText = this.add.text(x, y, `${amount}`, { 
            fontFamily: 'system-ui, Arial, sans-serif', 
            fontSize: '24px', 
            fontStyle: 'bold',
            color,
            stroke: '#000000',
            strokeThickness: 4
        });
        dmgText.setOrigin(0.5);
        this.tweens.add({
            targets: dmgText,
            y: y - 50,
            scale: 1.2,
            alpha: 0,
            duration: 900,
            ease: 'Cubic.easeOut',
            onComplete: () => dmgText.destroy()
        });
    }

    private executePlayerAttack()
    {
        if (this.enemies.length === 0) return;

        this.isCombatActionLocked = true;
        this.buttons.forEach(btn => btn.disableInteractive());

        const enemy = this.enemies[0];
        const enemyCard = this.enemyCards[0];
        
        const playerDmg = this.player.calculateDamage();
        enemy.takeDamage(playerDmg);

        // 1. Player dashes right
        if (this.playerCard) {
            this.playerCard.dash('right');
        }

        // 2. Damage impact happens after a brief delay
        this.time.delayedCall(100, () => {
            if (enemyCard) {
                enemyCard.shake();
                this.showFloatingDamage(enemyCard.x, enemyCard.y - 45, playerDmg, '#ffffff');
                enemyCard.updateHp(enemy.hp);
            }

            let msg = `You dealt ${playerDmg} damage to ${enemy.name}!`;

            // Check if enemy died
            if (enemy.hp <= 0) {
                const goldDropped = PhaserMath.Between(8, 15) * enemy.level;
                const xpReward = enemy.level * 20 + PhaserMath.Between(5, 15);

                this.gold += goldDropped;
                this.updateHUD();

                this.showFloatingDamage(enemyCard.x, enemyCard.y - 15, `+💰${goldDropped}`, '#fbbf24');
                this.time.delayedCall(150, () => {
                    if (this.playerCard) {
                        this.showFloatingDamage(this.playerCard.x, this.playerCard.y - 45, `+${xpReward} XP`, '#c084fc');
                    }
                });

                msg += `\n${enemy.name} was defeated!\nReceived 💰 ${goldDropped} Gold and ⭐ ${xpReward} XP!`;
                this.addLogMessage(msg);

                this.enemies.shift();
                this.enemyCards.shift();

                this.time.delayedCall(300, () => {
                    if (enemyCard) {
                        enemyCard.die(() => {
                            this.slideRemainingEnemyCards();
                        });
                    }

                    // Calculate XP percent before and after gain
                    const startPercent = this.player.xp / this.player.getXpRequiredForLevel(this.player.level);
                    const xpResult = this.player.gainXp(xpReward);
                    const endPercent = this.player.xp / this.player.getXpRequiredForLevel(this.player.level);

                    // Check if wave cleared
                    if (this.enemies.length === 0) {
                        this.time.delayedCall(300, () => {
                            this.animateXpGain(startPercent, endPercent, xpResult.levelsGained, () => {
                                this.addLogMessage('Wave cleared! More monsters are approaching...');
                                this.time.delayedCall(1200, () => {
                                    this.spawnNewEnemyCards();
                                    this.isCombatActionLocked = false;
                                    this.buttons.forEach(btn => btn.setInteractive({ useHandCursor: true }));
                                });
                            });
                        });
                    } else {
                        // Combat continues in current wave
                        this.time.delayedCall(300, () => {
                            this.animateXpGain(startPercent, endPercent, xpResult.levelsGained, () => {
                                this.isCombatActionLocked = false;
                                this.buttons.forEach(btn => btn.setInteractive({ useHandCursor: true }));
                            });
                        });
                    }
                });
            }
            else
            {
                // Enemy still alive, just resume combat ticking after attack animation finishes
                this.time.delayedCall(300, () => {
                    this.isCombatActionLocked = false;
                    this.buttons.forEach(btn => btn.setInteractive({ useHandCursor: true }));
                });
            }
        });
    }

    private executeEnemyAttack(index: number)
    {
        if (this.enemies.length <= index) return;

        const enemy = this.enemies[index];
        const enemyCard = this.enemyCards[index];
        if (!enemy || enemy.hp <= 0 || !enemyCard) return;

        this.isCombatActionLocked = true;
        this.buttons.forEach(btn => btn.disableInteractive());

        const enemyDmg = enemy.calculateDamage();
        
        if (enemyCard) {
            enemyCard.dash('left');
        }

        this.time.delayedCall(100, () => {
            this.player.takeDamage(enemyDmg);
            if (this.playerCard) {
                this.playerCard.shake();
                this.showFloatingDamage(this.playerCard.x, this.playerCard.y - 45, enemyDmg, '#ffcc00');
                this.playerCard.updateHp(this.player.hp);
            }

            const msg = `${enemy.name} dealt ${enemyDmg} damage to you!`;
            this.addLogMessage(msg);

            // Check if player died
            if (this.player.hp <= 0) {
                this.time.delayedCall(500, () => {
                    this.addLogMessage('You died!\nReturning to town...');
                    this.time.delayedCall(2000, () => {
                        this.gameState = GameState.Town;
                        this.clearCombatUI();
                        this.enemies = [];
                        this.updateUI();
                    });
                });
            } else {
                // Resume combat
                this.time.delayedCall(500, () => {
                    this.isCombatActionLocked = false;
                    this.buttons.forEach(btn => btn.setInteractive({ useHandCursor: true }));
                });
            }
        });
    }

    private spawnNewEnemyCards()
    {
        // Clear enemy cards list (should be empty anyway)
        this.enemyCards = [];

        // Generate new enemies if the array is empty
        this.spawnEnemiesForHunt();

        // Create Enemy Cards (slide in from right with staggered delays)
        const enemyX = 700;
        const enemyStartY = 160;
        const spacingY = 95;

        this.enemies.forEach((enemy, idx) => {
            const card = new CombatCard(
                this,
                enemyX, enemyStartY + idx * spacingY,
                enemy.name,
                enemy.hp, enemy.maxHp,
                enemy.level,
                enemy.dex,
                false // isPlayer
            );
            this.enemyCards.push(card);
            card.slideIn(1200, card.y, idx * 150);
        });
    }

    private fleeAction()
    {
        this.buttons.forEach(btn => btn.disableInteractive());
        this.addLogMessage('You fled back to town.');

        if (this.playerCard) {
            this.tweens.add({
                targets: this.playerCard,
                x: -200,
                alpha: 0,
                duration: 400,
                ease: 'Power2.easeIn'
            });
        }
        
        this.enemyCards.forEach((card, idx) => {
            this.tweens.add({
                targets: card,
                x: 1200,
                alpha: 0,
                duration: 400,
                delay: idx * 80,
                ease: 'Power2.easeIn'
            });
        });

        this.time.delayedCall(500, () => {
            this.gameState = GameState.Town;
            this.clearCombatUI();
            this.enemies = [];
            this.updateUI();
        });
    }

    calculateDamage(): number
    {
        if (this.enemies.length === 0) {
            return 0;
        }
        let damage:number = 0;

        this.enemies.forEach(enemy => {
            damage += enemy.calculateDamage();
        });
        return damage;
    }   

    generateEnemy(playerLevel: number): Entity
    {
        const enemyLevel = PhaserMath.Between(playerLevel, playerLevel + 2);
        //make enemy stats scale with level, making them slightly weaker than the player to keep it fun
        //replace title 'Enemy' with something more fun and random like 'Goblin', 'Orc', 'Troll', etc.
        const enemy = new Entity(`${this.getRandomEnemyName()} Lvl ${enemyLevel}`, enemyLevel, enemyLevel, enemyLevel, enemyLevel, enemyLevel);
        return enemy;
    }

    private getRandomEnemyName(): string
    {
        const enemyNames = ['Goblin', 'Orc', 'Troll', 'Skeleton', 'Zombie'];
        return enemyNames[PhaserMath.Between(0, enemyNames.length - 1)];
    }

    private updateChatBox()
    {
        this.chatBoxBg.clear();

        const margin = 10;
        const w = 1024 - margin * 2;
        const h = 180;
        const x = margin;
        const extraOffset = this.gameState === GameState.Town ? 4 : 0;
        const boxY = 768 - h - margin + extraOffset;

        // Draw background: slate-950 with 0.85 opacity
        this.chatBoxBg.fillStyle(0x020617, 0.85);
        this.chatBoxBg.fillRoundedRect(x, boxY, w, h, 8);

        // Draw border: slate-700
        this.chatBoxBg.lineStyle(2, 0x334155, 1.0);
        this.chatBoxBg.strokeRoundedRect(x, boxY, w, h, 8);

        // Draw pill header
        this.chatBoxBg.fillStyle(0x1e293b, 1.0);
        this.chatBoxBg.fillRoundedRect(x + 15, boxY + 10, 80, 20, 4);
        this.chatBoxBg.lineStyle(1.5, 0x475569, 1.0);
        this.chatBoxBg.strokeRoundedRect(x + 15, boxY + 10, 80, 20, 4);

        // Update positions and styling of text objects
        this.chatBoxHeader.setPosition(x + 55, boxY + 20);
        this.msg_text.setPosition(x + 15, boxY + 38);
        this.msg_text.setStyle({ wordWrap: { width: w - 30 } });

        // Re-render log with correct visible count for current state
        const visibleCount = this.gameState === GameState.Hunting ? 10 : 8;
        const visible = this.logMessages.slice(-visibleCount);
        this.msg_text.setText(visible.join('\n'));
    }

    private addLogMessage(message: string)
    {
        const now = new Date();
        const timestamp = [
            now.getHours().toString().padStart(2, '0'),
            now.getMinutes().toString().padStart(2, '0'),
            now.getSeconds().toString().padStart(2, '0')
        ].join(':');

        const lines = message.split('\n');
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.length > 0) {
                this.logMessages.push(`[${timestamp}] ${trimmed}`);
            }
        });

        if (this.logMessages.length > 10) {
            this.logMessages = this.logMessages.slice(-10);
        }

        if (this.msg_text) {
            const visibleCount = this.gameState === GameState.Hunting ? 10 : 8;
            const visible = this.logMessages.slice(-visibleCount);
            this.msg_text.setText(visible.join('\n'));
        }
    }

    private getScreenKey(): string
    {
        switch (this.gameState)
        {
            case GameState.Town: return 'town';
            case GameState.Hunting: return 'hunting';
            case GameState.Working: return 'working';
        }
    }

    private showTipForCurrentState(force: boolean): void
    {
        if (this.activeTipModal) return;

        const key = this.getScreenKey();
        if (!force && this.tipsShown[key]) return;

        this.tipsShown[key] = true;

        // Pause work tween while tip is open
        if (this.workTween && this.workTween.isPlaying())
        {
            this.workTween.pause();
        }

        this.activeTipModal = new TipModal(this, key, () => {
            this.activeTipModal = null;

            // Resume work tween
            if (this.workTween && this.workTween.isPaused())
            {
                this.workTween.resume();
            }
        });

        this.activeTipModal.setDepth(1000);
    }
}
