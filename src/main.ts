import StartGame from './game/main';

if (import.meta.hot) {
    import.meta.hot.accept(() => {
        window.location.reload();
    });
}

document.addEventListener('DOMContentLoaded', () => {

    StartGame('game-container');

});