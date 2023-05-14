export enum Operator {
  and = "and",
  or = "or",
  not = "not",
}

export enum Comparator {
  eq = "eq",
  lt = "lt",
  gt = "gt",
  lte = "lte",
  gte = "gte",
}

export type VisitorResult =
  | VisitorOperationResult
  | VisitorComparisonResult
  | VisitorStructuredQueryResult;
export type VisitorOperationResult = {
  [operator: string]: VisitorResult[];
};
export type VisitorComparisonResult = {
  [attr: string]: {
    [comparator: string]: string | number;
  };
};
export type VisitorStructuredQueryResult = {
  filter?:
    | VisitorStructuredQueryResult
    | VisitorComparisonResult
    | VisitorOperationResult;
};

export abstract class Visitor {
  abstract allowedOperators: Operator[];

  abstract allowedComparators: Comparator[];

  abstract visitOperation(operation: Operation): VisitorOperationResult;

  abstract visitComparison(comparison: Comparison): VisitorComparisonResult;

  abstract visitStructuredQuery(
    structuredQuery: StructuredQuery
  ): VisitorStructuredQueryResult;
}

export abstract class Expression {
  abstract exprName: "Operation" | "Comparison" | "StructuredQuery";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accept(visitor: Visitor) {
    if (this.exprName === "Operation") {
      return visitor.visitOperation(this as unknown as Operation);
    } else if (this.exprName === "Comparison") {
      return visitor.visitComparison(this as unknown as Comparison);
    } else if (this.exprName === "StructuredQuery") {
      return visitor.visitStructuredQuery(this as unknown as StructuredQuery);
    } else {
      throw new Error("Unknown Expression type");
    }
  }
}

export abstract class FilterDirective extends Expression {}

export class Comparison extends FilterDirective {
  exprName = "Comparison" as const;

  constructor(
    public comparator: Comparator,
    public attribute: string,
    public value: string | number
  ) {
    super();
  }
}

export class Operation extends FilterDirective {
  exprName = "Operation" as const;

  constructor(public operator: Operator, public args?: FilterDirective[]) {
    super();
  }
}

export class StructuredQuery extends Expression {
  exprName = "StructuredQuery" as const;

  constructor(public query: string, public filter?: FilterDirective) {
    super();
  }
}
