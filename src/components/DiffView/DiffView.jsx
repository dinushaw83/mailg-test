import { Diff, Hunk, withSourceExpansion, Decoration } from "react-diff-view";
import "react-diff-view/style/index.css";
import "./DiffView.css";

const UnfoldCollapsed = ({ previousHunk, currentHunk, onClick }) => {
  const start = previousHunk ? previousHunk.oldStart + previousHunk.oldLines : 1;
  const end = currentHunk.oldStart - 1;

  if (start > end) {
    return null;
  }

  return (
    <tbody onClick={() => onClick(start, end + 1)} className="expand-decoration">
      <tr>
        <td colspan="4">
          Expand lines {start} - {end}
        </td>
      </tr>
    </tbody>
  );
};

const DiffView = ({ hunks, onExpandRange }) => {
  const renderHunk = (children, hunk) => {
    const previousElement = children[children.length - 1];
    const decorationElement = (
      <UnfoldCollapsed
        key={"decoration-" + hunk.content}
        previousHunk={previousElement && previousElement.props.hunk}
        currentHunk={hunk}
        onClick={onExpandRange}
      />
    );
    children.push(decorationElement);

    const hunkElement = <Hunk key={"hunk-" + hunk.content} hunk={hunk} />;
    children.push(hunkElement);

    return children;
  };

  return (
    <Diff hunks={hunks} diffType="modify" viewType="split">
      {(hunks) => hunks.reduce(renderHunk, [])}
    </Diff>
  );
};

export default withSourceExpansion()(DiffView);
