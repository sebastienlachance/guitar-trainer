import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AnswerOption, CheckedAnswer, ChoiceButtons } from './choice-buttons';

const NOTES: AnswerOption<number>[] = [
  { value: 0, label: 'C' },
  { value: 2, label: 'D' },
  { value: 4, label: 'E' },
  { value: 5, label: 'F' },
];

async function renderChoices(
  options: { checked?: CheckedAnswer<number> | null; list?: AnswerOption<number>[] } = {},
) {
  const chosen = vi.fn();
  await render(ChoiceButtons<number>, {
    inputs: {
      label: 'Note names',
      options: options.list ?? NOTES,
      checked: options.checked ?? null,
    },
    on: { chosen },
  });
  return chosen;
}

describe('ChoiceButtons', () => {
  it('reports the option you click', async () => {
    const user = userEvent.setup();
    const chosen = await renderChoices();

    await user.click(screen.getByRole('button', { name: /E/ }));

    expect(chosen).toHaveBeenCalledWith(4);
  });

  it('picks with number keys', async () => {
    const user = userEvent.setup();
    const chosen = await renderChoices();

    await user.keyboard('3');

    expect(chosen).toHaveBeenCalledWith(4);
  });

  it('moves between options with the arrow keys, wrapping around', async () => {
    const user = userEvent.setup();
    const chosen = await renderChoices();

    screen.getByRole('button', { name: /C/ }).focus();
    await user.keyboard('{ArrowLeft}{Enter}');

    expect(chosen).toHaveBeenCalledWith(5);
  });

  it('has no number shortcuts beyond nine options', async () => {
    const user = userEvent.setup();
    const twelve = Array.from({ length: 12 }, (_, value) => ({ value, label: `N${value}` }));
    const chosen = await renderChoices({ list: twelve });

    await user.keyboard('3');

    expect(chosen).not.toHaveBeenCalled();
  });

  it('marks the right answer and yours once checked, and takes no more answers', async () => {
    const user = userEvent.setup();
    const chosen = await renderChoices({ checked: { picked: 2, correct: 4 } });

    expect(screen.getByRole('button', { name: /E \(correct answer\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /D \(your answer\)/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /F/ }));
    await user.keyboard('1');
    expect(chosen).not.toHaveBeenCalled();
  });
});
