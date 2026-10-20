import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Fretboard, FretboardDot } from './fretboard';

async function renderFretboard(options: { selectable?: boolean; dots?: FretboardDot[] } = {}) {
  const picked = vi.fn();
  const result = await render(Fretboard, {
    inputs: {
      dots: options.dots ?? [],
      description: 'Fretboard',
      window: { first: 1, last: 5 },
      selectable: options.selectable ?? true,
      cursorStart: { string: 3, fret: 0 },
    },
    on: { picked },
  });
  return { ...result, picked };
}

describe('Fretboard', () => {
  it('reports the position you click, open strings included', async () => {
    const user = userEvent.setup();
    const { container, picked } = await renderFretboard();

    await user.click(container.querySelector('[data-position="5:3"]')!);
    await user.click(container.querySelector('[data-position="1:0"]')!);

    expect(picked.mock.calls).toEqual([[{ string: 5, fret: 3 }], [{ string: 1, fret: 0 }]]);
  });

  it('moves a cursor with the arrow keys and picks with Enter', async () => {
    const user = userEvent.setup();
    const { picked } = await renderFretboard();

    screen.getByRole('application', { name: /Fretboard/ }).focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(screen.getByText('String 5 (A), fret 3')).toBeInTheDocument();
    await user.keyboard('{Enter}');

    expect(picked).toHaveBeenCalledWith({ string: 5, fret: 3 });
  });

  it('keeps the cursor on the neck', async () => {
    const user = userEvent.setup();
    await renderFretboard();

    screen.getByRole('application').focus();
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowLeft}{ArrowLeft}');
    expect(screen.getByText('String 1 (e), open')).toBeInTheDocument();
  });

  it('is a plain picture when not selectable', async () => {
    const { container } = await renderFretboard({
      selectable: false,
      dots: [{ string: 5, fret: 3, label: 'C', kind: 'miss' }],
    });

    expect(screen.getByRole('img', { name: 'Fretboard' })).not.toHaveAttribute('tabindex');
    expect(container.querySelector('.hit')).toBeNull();
    expect(container.querySelector('.dot.miss')).not.toBeNull();
  });

  it('draws context notes as faded rings, with their labels', async () => {
    const { container } = await renderFretboard({
      selectable: false,
      dots: [{ string: 4, fret: 2, label: '♭7', kind: 'ghost' }],
    });

    expect(container.querySelector('.dot.ghost')).toHaveTextContent('♭7');
  });

  it('shows an open string note with notes higher up the neck', async () => {
    const { container } = await render(Fretboard, {
      inputs: {
        dots: [
          { string: 6, fret: 0, label: 'E', kind: 'root' },
          { string: 6, fret: 4, label: 'A♭', kind: 'tone' },
        ],
        description: 'Fretboard',
      },
    });

    const drawn = [...container.querySelectorAll('.dot')].map((dot) => dot.textContent?.trim());
    expect(drawn).toEqual(['E', 'A♭']);
  });

  it('draws the highlighted string in the accent colour', async () => {
    const { container } = await render(Fretboard, {
      inputs: { dots: [], description: 'Fretboard', highlightString: 5 },
    });

    const highlighted = container.querySelectorAll('.highlight');
    expect([...highlighted].map((element) => element.tagName)).toEqual(['text', 'line']);
    expect(highlighted[0]).toHaveTextContent('A');
  });
});
