declare module 'react-mentions' {
  import * as React from 'react';

  export interface SuggestionDataItem {
    id: string;
    display: string;
    [key: string]: any;
  }

  export interface MentionProps {
    trigger?: string | RegExp;
    data?:
      | SuggestionDataItem[]
      | ((
          query: string,
          callback: (suggestions: SuggestionDataItem[]) => void
        ) => void | Promise<void>);
    markup?: string;
    displayTransform?: (id: string, display: string) => string;
    appendSpaceOnAdd?: boolean;
    onAdd?: (id: string, display: string, startPos: number, endPos: number) => void;
    renderSuggestion?: (
      suggestion: SuggestionDataItem,
      search: string,
      highlightedDisplay: React.ReactNode,
      index: number,
      focused: boolean
    ) => React.ReactNode;
    className?: string;
  }

  export interface MentionsInputProps {
    value: string;
    onChange?: (
      event: { target: { value: string } },
      newValue: string,
      newPlainTextValue: string,
      mentions: Array<{ id: string; display: string; childIndex: number }>
    ) => void;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    onPaste?: React.ClipboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    placeholder?: string;
    disabled?: boolean;
    singleLine?: boolean;
    style?: any;
    inputRef?: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
    suggestionsPortalHost?: HTMLElement | null;
    children?: React.ReactNode;
    className?: string;
    allowSuggestionsAboveCursor?: boolean;
    a11ySuggestionsListLabel?: string;
  }

  export const MentionsInput: React.ComponentType<MentionsInputProps>;
  export const Mention: React.ComponentType<MentionProps>;
}
