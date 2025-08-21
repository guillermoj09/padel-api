export interface Button {
  id: string;
  title: string;
}

export interface MessengerPort {
  sendText(to: string, text: string): Promise<void>;
  sendButtons(to: string, text: string, buttons: Button[]): Promise<void>;
}
