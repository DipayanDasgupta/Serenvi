import {
  buildUplineChain,
  chainToUplineIds,
  buildDownlineDepths,
  commissionForLevel,
  withdrawalFee,
  COMMISSION_RATES,
  COMMISSION_TOTAL_PERCENT,
  MAX_COMMISSION_DEPTH,
  type TreeNodeRow,
} from './mlm-rules';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * MLMTreeNode is a MATERIALIZED path: the rows for a descendant already list
 * every ancestor with its distance from that descendant. So the seller has one
 * row per ancestor — not one row per chain link.
 */
function sellerNodes(): TreeNodeRow[] {
  return [
    { ancestorId: 's1', descendantId: 'seller', depth: 1 },
    { ancestorId: 's2', descendantId: 'seller', depth: 2 },
    { ancestorId: 's3', descendantId: 'seller', depth: 3 },
  ];
}

describe('buildUplineChain', () => {
  it('maps each ancestor to the correct level for the seller', () => {
    const chain = buildUplineChain(sellerNodes());
    expect(chainToUplineIds(chain)).toEqual(['s1', 's2', 's3']);
    expect(chain.get(1)).toBe('s1');
    expect(chain.get(3)).toBe('s3');
  });

  it('returns nothing for an isolated distributor', () => {
    expect(buildUplineChain([]).size).toBe(0);
  });

  it('caps the chain at 15 levels', () => {
    // A 20-deep spine materialized for the seller: one row per ancestor.
    const nodes: TreeNodeRow[] = Array.from({ length: 20 }, (_, i) => ({
      ancestorId: `a${i + 1}`,
      descendantId: 'seller',
      depth: i + 1,
    }));
    const ids = chainToUplineIds(buildUplineChain(nodes));
    expect(ids).toHaveLength(MAX_COMMISSION_DEPTH);
    expect(ids[14]).toBe('a15');
    expect(ids).not.toContain('a16');
  });

  it('excludes a level deeper than the cap', () => {
    const nodes: TreeNodeRow[] = [{ ancestorId: 'far', descendantId: 'seller', depth: 20 }];
    expect(buildUplineChain(nodes).size).toBe(0);
  });

  it('treats the stored depth as the level (sponsor = 1)', () => {
    const chain = buildUplineChain([
      { ancestorId: 'sponsor', descendantId: 'seller', depth: 1 },
    ]);
    expect(chainToUplineIds(chain)).toEqual(['sponsor']);
  });

  it('keeps the first ancestor when a level is ambiguous', () => {
    const nodes: TreeNodeRow[] = [
      { ancestorId: 'near', descendantId: 'seller', depth: 1 },
      { ancestorId: 'far', descendantId: 'seller', depth: 1 },
    ];
    expect(buildUplineChain(nodes).get(1)).toBe('near');
  });
});

describe('buildDownlineDepths', () => {
  it('reports each team member depth for the seller', () => {
    const nodes: TreeNodeRow[] = [
      { ancestorId: 'seller', descendantId: 'm1', depth: 1 },
      { ancestorId: 'seller', descendantId: 'm2', depth: 2 },
      { ancestorId: 'seller', descendantId: 'm3', depth: 3 },
      { ancestorId: 'seller', descendantId: 'm4', depth: 16 }, // beyond cap
    ];
    expect(buildDownlineDepths(nodes).sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('ignores depth 0 and negatives', () => {
    const nodes: TreeNodeRow[] = [
      { ancestorId: 'x', descendantId: 'y', depth: 0 },
      { ancestorId: 'x', descendantId: 'z', depth: -1 },
      { ancestorId: 'x', descendantId: 'w', depth: 1 },
    ];
    expect(buildDownlineDepths(nodes)).toEqual([1]);
  });
});

describe('commission table', () => {
  it('matches the approved per-level rates', () => {
    expect(COMMISSION_RATES[1]).toBe(25);
    expect(COMMISSION_RATES[2]).toBe(7);
    expect(COMMISSION_RATES[3]).toBe(4.5);
    expect(COMMISSION_RATES[15]).toBe(1);
  });

  it('totals 54% — documentation claiming 55% is wrong', () => {
    // Sum the table so the published total can never disagree with the rates.
    expect(COMMISSION_TOTAL_PERCENT).toBe(54);
    expect(COMMISSION_TOTAL_PERCENT).not.toBe(55);
  });

  it('pays the documented amount at each level for a ₹10,000 sale', () => {
    const amount = new Decimal(10000);
    const expected = [2500, 700, 450, 250, 200, 200, 180, 160, 140, 120, 100, 100, 100, 100, 100];
    for (let level = 1; level <= 15; level++) {
      expect(commissionForLevel(amount, level).toNumber()).toBe(expected[level - 1]);
    }
    const total = expected.reduce((a, b) => a + b, 0);
    expect(total).toBe(5400);
    expect(total / 100).toBe(COMMISSION_TOTAL_PERCENT);
  });

  it('rejects an undefined level', () => {
    expect(() => commissionForLevel(new Decimal(100), 16)).toThrow(/level 16/);
  });

  it('scales with the sale amount', () => {
    expect(commissionForLevel(new Decimal(2000), 1).toNumber()).toBe(500);
  });
});

describe('withdrawal fee', () => {
  it('takes the greater of 2% or ₹20', () => {
    expect(withdrawalFee(new Decimal(1000)).toString()).toBe('20');   // 2%=20 -> flat
    expect(withdrawalFee(new Decimal(2000)).toString()).toBe('40');   // 2%=40
    expect(withdrawalFee(new Decimal(500)).toString()).toBe('20');    // 2%=10 -> flat
  });
});
