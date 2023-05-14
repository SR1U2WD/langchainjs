import {
  Comparator,
  Comparison,
  Operation,
  Operator,
  StructuredQuery,
  Visitor,
  VisitorComparisonResult,
  VisitorOperationResult,
  VisitorResult,
  VisitorStructuredQueryResult,
} from "../../chains/query_constructor/ir.js";

export class PineconeTranslator extends Visitor {
  allowedOperators: Operator[] = [Operator.and, Operator.or];

  allowedComparators: Comparator[] = [];

  private _formatFunction(func: Operator | Comparator): string {
    if (func in Comparator) {
      if (
        this.allowedComparators.length > 0 &&
        this.allowedComparators.indexOf(func as Comparator) === -1
      ) {
        throw new Error(
          `Comparator ${func} not allowed. Allowed operators: ${this.allowedComparators.join(
            ", "
          )}`
        );
      }
    } else if (func in Operator) {
      if (
        this.allowedOperators.length > 0 &&
        this.allowedOperators.indexOf(func as Operator) === -1
      ) {
        throw new Error(
          `Operator ${func} not allowed. Allowed operators: ${this.allowedOperators.join(
            ", "
          )}`
        );
      }
    } else {
      throw new Error("Unknown comparator or operator");
    }
    return `$${func}`;
  }

  visitOperation(operation: Operation): VisitorOperationResult {
    const args = operation.args?.map((arg) =>
      arg.accept(this)
    ) as VisitorResult[];
    return {
      [this._formatFunction(operation.operator)]: args,
    };
  }

  visitComparison(comparison: Comparison): VisitorComparisonResult {
    return {
      [comparison.attribute]: {
        [this._formatFunction(comparison.comparator)]: comparison.value,
      },
    };
  }

  visitStructuredQuery(query: StructuredQuery): VisitorStructuredQueryResult {
    let nextArg = {};
    if (query.filter) {
      nextArg = {
        filter: query.filter.accept(this),
      };
    }
    return nextArg;
  }
}
