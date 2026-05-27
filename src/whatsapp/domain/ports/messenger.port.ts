export interface Button {
  id: string;
  title: string;
}

export interface ListSectionRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListSectionRow[];
}

// domain/ports/messenger.port.ts
export interface MessengerPort {
  sendText(to: string, text: string): Promise<void>;
  sendButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[],
  ): Promise<void>;
  sendList?(
    to: string,
    payload: {
      header?: string;
      body: string;
      footer?: string;
      buttonText?: string;
      sections: ListSection[];
    },
  ): Promise<void>;
}
