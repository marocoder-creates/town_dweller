import { Scene, GameObjects, Geom } from 'phaser';
import { Button } from './Button';

export class QuantityModal extends GameObjects.Container
{
    private backdrop: GameObjects.Graphics;
    private background: GameObjects.Graphics;
    private modalTitle: GameObjects.Text;
    private qtyDisplay: GameObjects.Text;
    private costDisplay: GameObjects.Text;
    private priceDisplay: GameObjects.Text;
    private maxAllowedDisplay: GameObjects.Text;

    private minQty: number;
    private maxQty: number;
    private unitPrice: number;
    
    private currentQty: number;
    private inputString: string;

    private onConfirm: (qty: number) => void;
    private onCancel: () => void;

    constructor(
        scene: Scene,
        x: number,
        y: number,
        config: {
            minQty?: number;
            maxQty: number;
            unitPrice: number;
            onConfirm: (qty: number) => void;
            onCancel: () => void;
        }
    ) {
        super(scene, x, y);

        this.minQty = config.minQty !== undefined ? config.minQty : 1;
        this.maxQty = config.maxQty;
        this.unitPrice = config.unitPrice;
        this.onConfirm = config.onConfirm;
        this.onCancel = config.onCancel;

        // Ensure currentQty is within bounds [minQty, maxQty]
        const startQty = Math.max(this.minQty, Math.min(this.maxQty, this.minQty));
        this.currentQty = startQty;
        this.inputString = startQty.toString();

        scene.add.existing(this);
        this.createUI();
    }

    private createUI()
    {
        const width = 400;
        const height = 520;
        const halfW = width / 2;
        const halfH = height / 2;

        // 1. Darken full-screen backdrop (1024x768 canvas, centered at 512, 384)
        this.backdrop = this.scene.add.graphics();
        this.backdrop.fillStyle(0x000000, 0.6); // 60% black overlay
        this.backdrop.fillRect(-512, -384, 1024, 768);
        
        // Capture all input events on the backdrop to prevent clicking elements behind the modal
        this.backdrop.setInteractive(new Geom.Rectangle(-512, -384, 1024, 768), Geom.Rectangle.Contains);
        this.add(this.backdrop);

        // 2. Modal Background Card
        this.background = this.scene.add.graphics();
        this.background.fillStyle(0x0f172a, 0.98); // Slate-900 with high opacity
        this.background.fillRoundedRect(-halfW, -halfH, width, height, 16);
        this.background.lineStyle(3, 0xf59e0b, 1.0); // Gold border to match town theme
        this.background.strokeRoundedRect(-halfW, -halfH, width, height, 16);
        
        // Also capture clicks on the card itself
        this.background.setInteractive(new Geom.Rectangle(-halfW, -halfH, width, height), Geom.Rectangle.Contains);
        this.add(this.background);

        // 3. Header Title
        this.modalTitle = this.scene.add.text(0, -halfH + 35, 'BUY POTIONS', {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#fbbf24'
        }).setOrigin(0.5);
        this.add(this.modalTitle);

        // 4. Quantity & Cost Info Display Panel
        const panelBg = this.scene.add.graphics();
        panelBg.fillStyle(0x1e293b, 0.85); // Slate-800
        panelBg.fillRoundedRect(-180, -210, 360, 100, 10);
        panelBg.lineStyle(1.5, 0x475569, 1.0); // Slate-600
        panelBg.strokeRoundedRect(-180, -210, 360, 100, 10);
        this.add(panelBg);

        // Large Qty Display
        this.qtyDisplay = this.scene.add.text(-150, -160, `Qty: ${this.currentQty}`, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        this.add(this.qtyDisplay);

        // Cost display
        this.costDisplay = this.scene.add.text(150, -185, `Total: 💰${this.currentQty * this.unitPrice}`, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#fbbf24' // Amber/Gold
        }).setOrigin(1, 0.5);
        this.add(this.costDisplay);

        // Unit Price label
        this.priceDisplay = this.scene.add.text(150, -160, `Unit Price: 💰${this.unitPrice}`, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            color: '#94a3b8' // Slate-400
        }).setOrigin(1, 0.5);
        this.add(this.priceDisplay);

        // Max Allowed label
        this.maxAllowedDisplay = this.scene.add.text(150, -135, `Max Allowed: ${this.maxQty}`, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            color: '#10b981' // Emerald-500
        }).setOrigin(1, 0.5);
        this.add(this.maxAllowedDisplay);

        // 5. Keypad Layout (Digits 0-9, Backspace, Clear)
        // Digit keypad cols: x = -110, x = -50, x = 10
        // Helper col: x = 110
        // Grid spacing: x = 60, y = 60
        const buttonSize = 50;
        const spacing = 60;
        const keypadStartX = -110;
        const keypadStartY = -50;

        // Digits 1 to 9 in a 3x3 layout
        for (let r = 0; r < 3; r++)
        {
            for (let c = 0; c < 3; c++)
            {
                const digit = r * 3 + c + 1;
                const bx = keypadStartX + c * spacing;
                const by = keypadStartY + r * spacing;
                const btn = new Button(this.scene, bx, by, digit.toString(), () => {
                    this.onDigitClicked(digit);
                }, buttonSize, buttonSize);
                this.add(btn);
            }
        }

        // Row 4 of Keypad: 0, Backspace (⌫), and Clear (C)
        // 0 at column 1 (bx = -110)
        const btn0 = new Button(this.scene, keypadStartX, keypadStartY + 3 * spacing, '0', () => {
            this.onDigitClicked(0);
        }, buttonSize, buttonSize);
        this.add(btn0);

        // Backspace at column 2 (bx = -50)
        const btnBack = new Button(this.scene, keypadStartX + spacing, keypadStartY + 3 * spacing, '⌫', () => {
            this.onBackspaceClicked();
        }, buttonSize, buttonSize);
        this.add(btnBack);

        // Clear button at column 3 (bx = 10)
        const btnClear = new Button(this.scene, keypadStartX + 2 * spacing, keypadStartY + 3 * spacing, 'C', () => {
            this.onClearClicked();
        }, buttonSize, buttonSize);
        this.add(btnClear);

        // 6. Helper Shortcuts (Min, Max, +10, +100)
        // Helper column is at x = 110. Width is 70, height is 50.
        const helperX = 110;
        const helperW = 70;
        const helperH = 50;

        const btnMin = new Button(this.scene, helperX, keypadStartY, 'Min', () => {
            this.onMinClicked();
        }, helperW, helperH);
        this.add(btnMin);

        const btnMax = new Button(this.scene, helperX, keypadStartY + spacing, 'Max', () => {
            this.onMaxClicked();
        }, helperW, helperH);
        this.add(btnMax);

        const btnPlus10 = new Button(this.scene, helperX, keypadStartY + 2 * spacing, '+10', () => {
            this.onAddClicked(10);
        }, helperW, helperH);
        this.add(btnPlus10);

        const btnPlus100 = new Button(this.scene, helperX, keypadStartY + 3 * spacing, '+100', () => {
            this.onAddClicked(100);
        }, helperW, helperH);
        this.add(btnPlus100);

        // 7. Action buttons (Cancel, Confirm) at the bottom
        const actionY = 210;
        const actionW = 140;
        const actionH = 50;

        const btnCancel = new Button(this.scene, -95, actionY, 'Cancel', () => {
            this.onCancel();
        }, actionW, actionH);
        this.add(btnCancel);

        const btnConfirm = new Button(this.scene, 95, actionY, 'Confirm', () => {
            this.onConfirmClicked();
        }, actionW, actionH);
        this.add(btnConfirm);
    }

    private updateDisplay()
    {
        this.qtyDisplay.setText(`Qty: ${this.currentQty}`);
        this.costDisplay.setText(`Total: 💰${this.currentQty * this.unitPrice}`);
    }

    private onDigitClicked(digit: number)
    {
        // If current qty is the default minimum (and inputString matches it), or if inputString is '0', overwrite
        if ((this.currentQty === this.minQty && this.inputString === this.minQty.toString()) || this.inputString === '0')
        {
            this.inputString = digit.toString();
        }
        else
        {
            this.inputString += digit.toString();
        }

        let val = parseInt(this.inputString) || 0;
        if (val > this.maxQty)
        {
            val = this.maxQty;
            this.inputString = val.toString();
        }

        this.currentQty = val;
        this.updateDisplay();
    }

    private onBackspaceClicked()
    {
        if (this.inputString.length > 1)
        {
            this.inputString = this.inputString.slice(0, -1);
        }
        else
        {
            this.inputString = '0';
        }

        this.currentQty = parseInt(this.inputString) || 0;
        this.updateDisplay();
    }

    private onClearClicked()
    {
        this.inputString = '0';
        this.currentQty = 0;
        this.updateDisplay();
    }

    private onMinClicked()
    {
        this.currentQty = this.minQty;
        this.inputString = this.minQty.toString();
        this.updateDisplay();
    }

    private onMaxClicked()
    {
        this.currentQty = this.maxQty;
        this.inputString = this.maxQty.toString();
        this.updateDisplay();
    }

    private onAddClicked(amount: number)
    {
        let val = this.currentQty + amount;
        if (val > this.maxQty)
        {
            val = this.maxQty;
        }
        this.currentQty = val;
        this.inputString = val.toString();
        this.updateDisplay();
    }

    private onConfirmClicked()
    {
        // Enforce the min/max constraints on final confirmation
        const finalQty = Math.max(this.minQty, Math.min(this.maxQty, this.currentQty));
        this.onConfirm(finalQty);
    }
}
