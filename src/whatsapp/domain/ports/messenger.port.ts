export interface Button {
  id: string;
  title: string;
}

// domain/ports/messenger.port.ts
export interface MessengerPort {
  sendText(to: string, text: string): Promise<void>;
  sendButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[],
  ): Promise<void>;
  // ⬇️ opcional (WhatsApp List Message)
  sendList?(
    to: string,
    payload: {
      header?: string;
      body: string;
      footer?: string;
      sections: {
        title: string;
        rows: { id: string; title: string; description?: string }[];
      }[];
    },
  ): Promise<void>;
}
