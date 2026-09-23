import { Navigate, useParams, useLocation } from 'react-router-dom';

/**
 * Keeps every old /prayer-cells/* URL working after groups moved inside
 * Prayer Rooms.
 *
 * This is not cosmetic. Those URLs are already out in the world: the share
 * sheet on a group detail page copied `${origin}/prayer-cells/:id`, and older
 * CELL_* notification rows still carry refIds that resolved to those paths.
 * Nothing is deleted server-side, so the destination always exists — this just
 * points the old address at the new one.
 *
 * `replace` so the redirect does not sit in history and trap the back button.
 *
 * @param {string} to  Target pattern; ':cellId' is substituted from the match.
 */
export default function LegacyCellRedirect({ to }) {
  const params = useParams();
  const location = useLocation();
  const target = to.replace(':cellId', params.cellId ?? '');
  return <Navigate to={`${target}${location.search}`} replace state={location.state} />;
}
