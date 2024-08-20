const EVENTS = [
    'click',
    'dblclick',
    'mousedown',
    'mouseup',
    'mousemove', // Stelle sicher, dass `mousemove` hinzugefügt wird
    'submit',
    'change',
];

export function addEventListeners(
    rootElement: ShadowRoot | HTMLElement,
    context: HTMLElement,
    events: string[] = EVENTS
): void {
    events.forEach((eventType) => {
        const eventHandler = createEventHandler(context);
        rootElement.addEventListener(eventType, eventHandler);
        // Speichere den Event-Handler, damit er später entfernt werden kann
        (context as any)[`_${eventType}Handler`] = eventHandler;
    });
}

export function removeEventListeners(
    rootElement: ShadowRoot | HTMLElement,
    context: HTMLElement,
    events: string[] = EVENTS
): void {
    events.forEach((eventType) => {
        const eventHandler = (context as any)[`_${eventType}Handler`];
        if (eventHandler) {
            rootElement.removeEventListener(eventType, eventHandler);
        }
    });
}

function createEventHandler(context: HTMLElement) {
    return function (event: Event) {
        handleEvent(event, context);
    };
}

function handleEvent(event: Event, context: HTMLElement) {
    const target = event.target as HTMLElement;
    let action: string | null = null;

    if (event.type === 'click') {
        action = target.getAttribute('(click)');
    } else if (event.type === 'dblclick') {
        action = target.getAttribute('(dblclick)');
    } else if (event.type === 'mousedown') {
        action = target.getAttribute('(mousedown)');
    } else if (event.type === 'mouseup') {
        action = target.getAttribute('(mouseup)');
    } else if (event.type === 'mousemove') {
        action = target.getAttribute('(mousemove)');
    } else if (event.type === 'submit') {
        action = target.getAttribute('(submit)');
    } else if (event.type === 'change') {
        action = target.getAttribute('(change)');
    }

    if (action) {
        const match = action.match(/(\w+)\((.*?)\)/);

        if (match) {
            const funcName = match[1];
            const paramString = match[2];
            const paramNames = paramString
                .split(',')
                .map((param) => param.trim());

            const params = paramNames.map((paramName) => {
                if (paramName === 'event') {
                    return event;
                }

                // Prüfen, ob der Parameter ein String ist (in Anführungszeichen)
                if (/^['"].*['"]$/.test(paramName)) {
                    return paramName.slice(1, -1); // Entfernt die Anführungszeichen
                }

                // Prüfen, ob der Parameter eine Zahl ist
                if (!isNaN(Number(paramName))) {
                    return Number(paramName); // Konvertiert in eine Zahl
                }

                // Prüfen, ob der Parameter im Kontext existiert
                if (paramName in context) {
                    return (context as any)[paramName];
                } else {
                    console.error(
                        `Parameter "${paramName}" wurde im Kontext nicht gefunden.`
                    );
                    return undefined;
                }
            });

            // Überprüfen, ob einer der Parameter undefined ist und ob Parameter erwartet wurden
            if (paramNames.length > 0 && params.includes(undefined)) {
                console.error(
                    `Die Methode "${funcName}" konnte aufgrund eines fehlenden oder ungültigen Parameters nicht aufgerufen werden.`
                );
            } else if (typeof (context as any)[funcName] === 'function') {
                (context as any)[funcName](...params);
            } else {
                console.error(
                    `Die Methode "${funcName}" wurde in der Klasse nicht gefunden.`
                );
            }
        } else {
            // Wenn keine Parameter übergeben werden, rufen wir die Methode direkt auf
            if (typeof (context as any)[action] === 'function') {
                (context as any)[action](event);
            } else {
                console.error(
                    `Die Methode "${action}" wurde in der Klasse nicht gefunden.`
                );
            }
        }
    }
}
