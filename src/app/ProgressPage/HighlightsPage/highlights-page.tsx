import { useEffect } from "react";
import { RootState, useAppDispatch, useAppSelector } from "../../../store/store";
import { fetchExperimentHighlights } from "../../../store/slices/experimentHighlightsSlice";
import { useParams } from "react-router-dom";

const HighlightsPage = () => {
    const { experimentId } = useParams();
    const { experimentHighlights } = useAppSelector((state: RootState) => state.experimentHighlights);
    const dispatch = useAppDispatch();
    useEffect(() => {
        if(experimentId) {
            dispatch(fetchExperimentHighlights(experimentId));
        }
    }, []);
    
    return (
        <div>
            <h1>Highlights Page</h1>
        </div>
    )
}

export default HighlightsPage;